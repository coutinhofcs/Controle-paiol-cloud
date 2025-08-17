import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc, getDoc, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAYvkpAe9Nfnn53JlSg8vOrKUFmUHn6oek",
  authDomain: "controle-de-paiol.firebaseapp.com",
  projectId: "controle-de-paiol",
  storageBucket: "controle-de-paiol.firebasestorage.app",
  messagingSenderId: "202438664461",
  appId: "1:202438664461:web:c60d98f85fe8ab2ece9044",
  measurementId: "G-BD3BR04LJQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
window.db = db; window.auth = auth; window.currentEdit = window.currentEdit || null;

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  const listArea = $('listArea');
  const empty = $('empty');
  const manageSection = $('manageSection');
  const actionMsg = $('actionMsg');
  const selectRemover = $('selectRemover');
  const editor = $('editor');
  const histArea = $('histArea');
  const histTableBody = document.querySelector('#histTable tbody');

  // UI tab switching
  $('tabPanel').addEventListener('click', ()=>{ $('tabPanel').classList.add('active'); $('tabHist').classList.remove('active'); histArea.style.display='none'; editor.style.display='none'; $('listArea').style.display='block'; });
  $('tabHist').addEventListener('click', ()=>{ $('tabHist').classList.add('active'); $('tabPanel').classList.remove('active'); histArea.style.display='block'; editor.style.display='none'; $('listArea').style.display='none'; loadHistory(); });

  // Auth actions
  $('btnLogin').addEventListener('click', async ()=>{ try{ await signInWithEmailAndPassword(auth, $('email').value.trim(), $('senha').value); }catch(e){ $('authMsg').textContent = e.message; console.error(e); }});
  $('btnRegister').addEventListener('click', async ()=>{ try{ const userCred = await createUserWithEmailAndPassword(auth, $('email').value.trim(), $('senha').value); promptForNickname(userCred.user); }catch(e){ $('authMsg').textContent = e.message; console.error(e); }});
  $('signOutBtn').addEventListener('click', async ()=>{ await signOut(auth); });

  // Manage actions
  $('btnAdd').addEventListener('click', ()=> addPaiol($('nomePaiol').value.trim()));
  $('btnRemove').addEventListener('click', removePaiolAction);

  // Editor actions
  $('btnCancel').addEventListener('click', ()=>{ editor.style.display='none'; currentEdit=null; window.currentEdit = null; });
  $('btnSave').addEventListener('click', async ()=>{ await saveEditor(); });

  // Export buttons
  $('btnExportCsv').addEventListener('click', ()=> exportHistoryCSV(true));
  $('btnExportCsvPaiol').addEventListener('click', ()=> exportHistoryCSV(false));

  // Auth state listener
  onAuthStateChanged(auth, user=>{
    if(user){
      $('authForm').style.display='none';
      $('userRow').style.display='flex';
      $('userNick').textContent = user.displayName || user.email;
      manageSection.style.display='block';
      startListeners();
      if(!user.displayName) promptForNickname(user);
    } else {
      $('authForm').style.display='block';
      $('userRow').style.display='none';
      manageSection.style.display='none';
      if(window.unsubscribe) window.unsubscribe();
      listArea.innerHTML='';
      selectRemover.innerHTML = '<option value="">Selecione um paiol</option>';
      histTableBody.innerHTML='';
    }
  });

  async function promptForNickname(user){
    let nick = null;
    while(!nick){
      nick = prompt("Escolha um apelido (como será exibido no histórico):");
      if(nick === null) break;
      nick = (nick||'').trim();
    }
    if(nick){
      try{ await updateProfile(user, { displayName: nick }); $('userNick').textContent = nick; }catch(e){ console.error("Falha ao salvar apelido:", e); }
    }
  }

  function showAction(msg,type='ok'){ actionMsg.innerHTML = '<div class="msg '+(type==='ok'?'ok':type==='warn'?'warn':'err')+'">'+msg+'</div>'; setTimeout(()=>actionMsg.innerHTML='',4000); }

  // Backend ops
  async function addPaiol(name){
    if(!name) return showAction("Digite um nome", 'warn');
    try{
      await addDoc(collection(db,'paiois'), { nome: name, tempAtual: null, tempMax: null, tempMin: null, umid: null, lacre: null, lastUpdate: null, lastBy: null, createdAt: serverTimestamp() });
      showAction("Paiol adicionado", 'ok');
    }catch(e){ showAction("Falha ao adicionar: "+e.message, 'err'); console.error(e); }
  }

  async function removePaiolAction(){
    const id = selectRemover.value;
    if(!id) return showAction("Selecione um paiol", 'warn');
    if(!confirm("Confirmar remoção do paiol?")) return;
    try{ await deleteDoc(doc(db,'paiois',id)); showAction("Paiol removido", 'ok'); }catch(e){ showAction("Falha ao remover: "+e.message, 'err'); console.error(e); }
  }

  // Listeners
  async function startListeners(){
    if(window.unsubscribe) window.unsubscribe();
    try{
      const q = query(collection(db,'paiois'), orderBy('nome','asc'));
      window.unsubscribe = onSnapshot(q, snap => {
        listArea.innerHTML=''; selectRemover.innerHTML = '<option value="">Selecione um paiol</option>';
        if(snap.empty){ empty.style.display='block'; } else empty.style.display='none';
        snap.forEach(d=>{
          const data = d.data(); const id = d.id;
          const div = document.createElement('div'); div.className='card';
          const lastInfo = data.lastUpdate ? new Date(data.lastUpdate.toDate()).toLocaleString() : '—';
          const lastBy = data.lastBy || '—';
          div.innerHTML = `<div class='row'><strong>${escapeHtml(data.nome)}</strong><div class='right muted'>Última: ${lastInfo}</div></div>
            <div class='help'>Temp atual: ${data.tempAtual==null?'-':data.tempAtual} °C • Umid: ${data.umid==null?'-':data.umid}%</div>
            <div style='display:flex;gap:8px;margin-top:8px'>
              <button class='small' data-edit='${id}'>Editar</button>
              <button class='small' data-history='${id}'>Histórico</button>
            </div>
            <div class='help muted' style='margin-top:6px'>Última atualização por: ${escapeHtml(lastBy)}</div>`;
          listArea.appendChild(div);
          const opt = document.createElement('option'); opt.value = id; opt.textContent = data.nome; selectRemover.appendChild(opt);
        });
        document.querySelectorAll('button[data-edit]').forEach(b=> b.onclick = ()=> openEditor(b.getAttribute('data-edit')));
        document.querySelectorAll('button[data-history]').forEach(b=> b.onclick = ()=> showHistoryForPaiol(b.getAttribute('data-history')));
      }, err => { showAction("Erro ao ouvir paióis: "+err.message, 'err'); console.error(err); });
    }catch(e){ showAction("Erro iniciando listeners: "+e.message, 'err'); console.error(e); }
  }

  function escapeHtml(s){ return (s||'').toString().replace(/</g,'&lt;'); }

  async function openEditor(id){
    currentEdit = id; window.currentEdit = currentEdit;
    try{
      const docRef = doc(db,'paiois',id);
      const snap = await getDoc(docRef);
      if(!snap.exists()){ showAction("Paiol não encontrado",'err'); return; }
      const d = snap.data();
      $('editName').value = d.nome;
      $('editTemp').value = d.tempAtual==null?'':d.tempAtual;
      $('editMax').value = d.tempMax==null?'':d.tempMax;
      $('editMin').value = d.tempMin==null?'':d.tempMin;
      $('editUmid').value = d.umid==null?'':d.umid;
      $('editLacre').value = d.lacre || '';
      $('editorTitle').textContent = 'Editar — '+d.nome;
      editor.style.display = 'block';
      histArea.style.display = 'none';
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(e){ showAction("Erro ao abrir editor: "+e.message,'err'); console.error(e); }
  }

  async function saveEditor(){
    if(!currentEdit) return;
    const temp = document.getElementById('editTemp').value ? parseFloat(document.getElementById('editTemp').value) : null;
    const max = document.getElementById('editMax').value ? parseFloat(document.getElementById('editMax').value) : null;
    const min = document.getElementById('editMin').value ? parseFloat(document.getElementById('editMin').value) : null;
    const umid = document.getElementById('editUmid').value ? parseFloat(document.getElementById('editUmid').value) : null;
    const lacre = document.getElementById('editLacre').value ? document.getElementById('editLacre').value.trim() : null;
    try{
      const docRef = doc(db,'paiois',currentEdit);
      await updateDoc(docRef, { tempAtual: temp, tempMax: max, tempMin: min, umid: umid, lacre: lacre, lastUpdate: serverTimestamp(), lastBy: getCurrentUserDisplay() });
      await addDoc(collection(db,'history'), { t: serverTimestamp(), paiolId: currentEdit, paiolName: document.getElementById('editName').value, tempAtual: temp, tempMax: max, tempMin: min, umid: umid, lacre: lacre, user: getCurrentUserDisplay() });
      showAction("Atualização salva","ok");
      editor.style.display='none'; currentEdit=null; window.currentEdit = null;
    }catch(e){ showAction("Falha ao salvar: "+e.message,'err'); console.error(e); }
  }

  function getCurrentUserDisplay(){
    const user = auth.currentUser;
    return user ? (user.displayName || user.email) : 'Anônimo';
  }

  async function loadHistory(){
    histTableBody.innerHTML='';
    try{
      const q = query(collection(db,'history'), orderBy('t','desc'));
      const snap = await getDocs(q);
      snap.forEach(d=>{
        const row = d.data();
        const dt = row.t && row.t.toDate ? row.t.toDate().toLocaleString() : '—';
        const changes = [];
        if(row.tempAtual!=null) changes.push('Atual: '+row.tempAtual+'°C');
        if(row.tempMax!=null) changes.push('Máx: '+row.tempMax+'°C');
        if(row.tempMin!=null) changes.push('Mín: '+row.tempMin+'°C');
        if(row.umid!=null) changes.push('Umid: '+row.umid+'%');
        if(row.lacre) changes.push('Lacre: '+row.lacre);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${dt}</td><td>${escapeHtml(row.paiolName)}</td><td>${escapeHtml(row.user)}</td><td>${escapeHtml(changes.join('; '))}</td>`;
        histTableBody.appendChild(tr);
      });
    }catch(e){ showAction("Falha ao carregar histórico: "+e.message,'err'); console.error(e); }
  }

  async function showHistoryForPaiol(paiolId){
    histTableBody.innerHTML='';
    currentEdit = paiolId; window.currentEdit = currentEdit;
    try{
      const q = query(collection(db,'history'), where('paiolId','==',paiolId), orderBy('t','desc'));
      const snap = await getDocs(q);
      snap.forEach(d=>{
        const row = d.data();
        const dt = row.t && row.t.toDate ? row.t.toDate().toLocaleString() : '—';
        const changes = [];
        if(row.tempAtual!=null) changes.push('Atual: '+row.tempAtual+'°C');
        if(row.tempMax!=null) changes.push('Máx: '+row.tempMax+'°C');
        if(row.tempMin!=null) changes.push('Mín: '+row.tempMin+'°C');
        if(row.umid!=null) changes.push('Umid: '+row.umid+'%');
        if(row.lacre) changes.push('Lacre: '+row.lacre);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${dt}</td><td>${escapeHtml(row.paiolName)}</td><td>${escapeHtml(row.user)}</td><td>${escapeHtml(changes.join('; '))}</td>`;
        histTableBody.appendChild(tr);
      });
      document.getElementById('tabHist').click();
    }catch(e){ showAction("Falha ao carregar histórico: "+e.message,'err'); console.error(e); }
  }

  // Export CSV
  async function exportHistoryCSV(all=true){
    try{
      let q;
      if(all){
        q = query(collection(db,'history'), orderBy('t','desc'));
      } else {
        const pid = currentEdit || window.currentEdit;
        if(!pid){ alert('Nenhum paiol selecionado. Abra o histórico do paiol antes de exportar filtrado.'); return; }
        q = query(collection(db,'history'), where('paiolId','==', pid), orderBy('t','desc'));
      }
      const snap = await getDocs(q);
      if(snap.empty){ alert('Histórico vazio. Nada para exportar.'); return; }
      const rows = [];
      const header = ['DataHora','PaiolId','PaiolNome','Usuario','TempAtual','TempMax','TempMin','Umidade','Lacre'];
      rows.push(header.join(','));
      snap.forEach(docSnap => {
        const r = docSnap.data();
        const dt = (r.t && r.t.toDate) ? r.t.toDate().toISOString() : (r.t || '');
        const paiolId = r.paiolId || '';
        const paiolName = r.paiolName ? r.paiolName.toString().replace(/"/g,'""') : '';
        const user = r.user ? r.user.toString().replace(/"/g,'""') : '';
        const tempAtual = (r.tempAtual!=null) ? r.tempAtual : '';
        const tempMax = (r.tempMax!=null) ? r.tempMax : '';
        const tempMin = (r.tempMin!=null) ? r.tempMin : '';
        const umid = (r.umid!=null) ? r.umid : '';
        const lacre = r.lacre ? r.lacre.toString().replace(/"/g,'""') : '';
        const line = [
          `"${dt}"`,
          `"${paiolId}"`,
          `"${paiolName}"`,
          `"${user}"`,
          `"${tempAtual}"`,
          `"${tempMax}"`,
          `"${tempMin}"`,
          `"${umid}"`,
          `"${lacre}"`
        ].join(',');
        rows.push(line);
      });
      const csvContent = rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const filename = 'historico_paiol_' + (all ? 'todos_' : (currentEdit || 'filtrado_')) + new Date().toISOString().slice(0,19).replace(/[:T]/g,'-') + '.csv';
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(()=>{ URL.revokeObjectURL(link.href); link.remove(); }, 5000);
    }catch(e){ console.error('Erro exportando histórico:', e); alert('Falha ao exportar histórico: ' + (e && e.message ? e.message : e)); }
  }

  document.getElementById('ano').textContent = new Date().getFullYear();

}); // DOMContentLoaded end