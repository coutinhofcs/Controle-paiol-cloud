import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, where, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAYvkpAe9Nfnn53JlSg8vOrKUFmUHn6oek",
  authDomain: "controle-de-paiol.firebaseapp.com",
  projectId: "controle-de-paiol",
  storageBucket: "controle-de-paiol.firebasestorage.app",
  messagingSenderId: "202438664461",
  appId: "1:202438664461:web:c60d98f85fe8ab2ece9044",
  measurementId: "G-BD3BR04LJQ"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// expõe no escopo global (para exportação e debug)
window.db = db;
window.auth = auth;
window.currentEdit = null;

// atalhos
const $ = id => document.getElementById(id);
const listArea = $("listArea");
const histArea = $("histArea");
const histTableBody = $("histTableBody");
const editor = $("editor");

// ---------------- Autenticação ----------------
$("loginBtn").onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, $("loginEmail").value, $("loginPassword").value);
  } catch(err){ alert("Erro ao entrar: "+err.message); }
};
$("registerBtn").onclick = async () => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, $("regEmail").value, $("regPassword").value);
    const nick = prompt("Escolha um apelido:");
    if(nick) await updateProfile(cred.user, { displayName: nick });
  } catch(err){ alert("Erro ao registrar: "+err.message); }
};
$("logoutBtn").onclick = ()=> signOut(auth);

// ---------------- Sessão ----------------
onAuthStateChanged(auth, user=>{
  if(user){
    $("auth").style.display="none";
    $("app").style.display="block";
    $("userName").innerText = user.displayName || user.email;
    loadPaiols();
  } else {
    $("auth").style.display="block";
    $("app").style.display="none";
  }
});

// ---------------- Paióis ----------------
async function loadPaiols(){
  const q = query(collection(db,"paiois"), orderBy("nome","asc"));
  onSnapshot(q, snap=>{
    listArea.innerHTML="";
    snap.forEach(docSnap=>{
      const d = docSnap.data();
      const div = document.createElement("div");
      div.className="paiolCard";
      div.innerHTML=`
        <h3>${d.nome}</h3>
        <p>Temp Atual: ${d.temperaturaAtual||"-"}</p>
        <p>Temp Min: ${d.temperaturaMin||"-"}</p>
        <p>Temp Max: ${d.temperaturaMax||"-"}</p>
        <p>Umidade: ${d.umidade||"-"}</p>
        <p>Lacre: ${d.lacre||"-"}</p>
        <button onclick="editPaiol('${docSnap.id}')">Editar</button>
        <button onclick="deletePaiol('${docSnap.id}')">Remover</button>
        <button onclick="showHistoryForPaiol('${docSnap.id}')">Histórico</button>
      `;
      listArea.appendChild(div);
    });
  });
}

$("addPaiolBtn").onclick = async () => {
  const nome = prompt("Nome do novo paiol:");
  if(nome){
    await addDoc(collection(db,"paiois"), { nome });
  }
};

window.deletePaiol = async (id)=>{
  if(confirm("Remover paiol?")){
    await deleteDoc(doc(db,"paiois",id));
  }
};

window.editPaiol = async (id)=>{
  window.currentEdit = id;
  const d = await (await getDocs(query(collection(db,"paiois"), where("__name__","==",id)))).docs[0].data();
  $("editNome").value = d.nome;
  $("editTempAtual").value = d.temperaturaAtual||"";
  $("editTempMin").value = d.temperaturaMin||"";
  $("editTempMax").value = d.temperaturaMax||"";
  $("editUmidade").value = d.umidade||"";
  $("editLacre").value = d.lacre||"";
  editor.style.display="block";
};

$("saveEditBtn").onclick = async ()=>{
  if(!window.currentEdit) return;
  const ref = doc(db,"paiois",window.currentEdit);
  await updateDoc(ref,{
    nome:$("editNome").value,
    temperaturaAtual:$("editTempAtual").value,
    temperaturaMin:$("editTempMin").value,
    temperaturaMax:$("editTempMax").value,
    umidade:$("editUmidade").value,
    lacre:$("editLacre").value
  });
  await addDoc(collection(db,"history"),{
    paiolId:window.currentEdit,
    user:auth.currentUser.displayName || auth.currentUser.email,
    temperaturaAtual:$("editTempAtual").value,
    temperaturaMin:$("editTempMin").value,
    temperaturaMax:$("editTempMax").value,
    umidade:$("editUmidade").value,
    lacre:$("editLacre").value,
    t:serverTimestamp()
  });
  editor.style.display="none";
  window.currentEdit=null;
};

// ---------------- Histórico ----------------
async function loadHistory(){
  histTableBody.innerHTML="";
  const q = query(collection(db,"history"), orderBy("t","desc"));
  const snap = await getDocs(q);
  snap.forEach(docSnap=>{
    const r = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML=`
      <td>${r.t?.seconds ? new Date(r.t.seconds*1000).toLocaleString() : ""}</td>
      <td>${r.user||""}</td>
      <td>${r.temperaturaAtual||""}</td>
      <td>${r.temperaturaMin||""}</td>
      <td>${r.temperaturaMax||""}</td>
      <td>${r.umidade||""}</td>
      <td>${r.lacre||""}</td>
    `;
    histTableBody.appendChild(tr);
  });
}

window.showHistoryForPaiol = async (paiolId)=>{
  window.currentEdit = paiolId;
  $('tabHist').classList.add('active');
  $('tabPanel').classList.remove('active');
  histArea.style.display='block';
  editor.style.display='none';
  $('listArea').style.display='none';

  histTableBody.innerHTML="";
  const q = query(collection(db,"history"), where("paiolId","==",paiolId), orderBy("t","desc"));
  const snap = await getDocs(q);
  snap.forEach(docSnap=>{
    const r = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML=`
      <td>${r.t?.seconds ? new Date(r.t.seconds*1000).toLocaleString() : ""}</td>
      <td>${r.user||""}</td>
      <td>${r.temperaturaAtual||""}</td>
      <td>${r.temperaturaMin||""}</td>
      <td>${r.temperaturaMax||""}</td>
      <td>${r.umidade||""}</td>
      <td>${r.lacre||""}</td>
    `;
    histTableBody.appendChild(tr);
  });
};

// Aba Histórico → limpa filtro
$("tabHist").addEventListener("click", ()=>{
  $("tabHist").classList.add("active");
  $("tabPanel").classList.remove("active");
  histArea.style.display="block";
  editor.style.display="none";
  $("listArea").style.display="none";
  window.currentEdit = null;
  loadHistory();
});

// ---------------- Exportação ----------------
window.exportHistoryCSV = async (all=true)=>{
  try{
    let q;
    if(all){
      q = query(collection(db,"history"), orderBy("t","desc"));
    } else {
      if(!window.currentEdit){ alert("Abra o histórico de um paiol antes de exportar filtrado."); return; }
      q = query(collection(db,"history"), where("paiolId","==",window.currentEdit), orderBy("t","desc"));
    }
    const snap = await getDocs(q);
    let csv="Data,Usuário,Temp Atual,Temp Min,Temp Max,Umidade,Lacre\n";
    snap.forEach(docSnap=>{
      const r = docSnap.data();
      csv += `${r.t?.seconds? new Date(r.t.seconds*1000).toLocaleString():""},${r.user||""},${r.temperaturaAtual||""},${r.temperaturaMin||""},${r.temperaturaMax||""},${r.umidade||""},${r.lacre||""}\n`;
    });
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download = all ? "historico_todos.csv" : `historico_paiol_${window.currentEdit}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }catch(err){ alert("Falha ao exportar histórico: "+err.message); }
};
