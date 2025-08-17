import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// === Configuração Firebase ===
const firebaseConfig = {
  apiKey: "SUA_APIKEY",
  authDomain: "controle-de-paiol.firebaseapp.com",
  projectId: "controle-de-paiol",
  storageBucket: "controle-de-paiol.appspot.com",
  messagingSenderId: "202438664461",
  appId: "1:202438664461:web:c60d98f85fe8ab2ece9044",
  measurementId: "G-BD3BR04LJQ"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
window.db = db;
window.auth = auth;
window.currentEdit = null;
let histFilterPaiolId = null;
window.histFilterPaiolId = null;

// === Utilidades ===
const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;"
  }[c]));
}

function setActiveTab(tab) {
  const listArea = $('listArea');
  const editor = $('editor');
  const histArea = $('histArea');
  if (tab === 'hist') {
    $('tabHist').classList.add('active');
    $('tabPanel').classList.remove('active');
    histArea.style.display = 'block';
    editor.style.display = 'none';
    listArea.style.display = 'none';
  } else {
    $('tabPanel').classList.add('active');
    $('tabHist').classList.remove('active');
    histArea.style.display = 'none';
    editor.style.display = 'none';
    listArea.style.display = 'block';
  }
}

// === Autenticação ===
onAuthStateChanged(auth, (user) => {
  if (user) {
    $('loginArea').style.display = 'none';
    $('appArea').style.display = 'block';
    loadPaiols();
  } else {
    $('loginArea').style.display = 'block';
    $('appArea').style.display = 'none';
  }
});

$('btnLogin').onclick = async () => {
  const email = $('email').value;
  const pass = $('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    alert("Falha no login: " + e.message);
  }
};

$('btnRegister').onclick = async () => {
  const email = $('email').value;
  const pass = $('password').value;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    let nick = prompt("Escolha um apelido:");
    if (nick) {
      await updateProfile(cred.user, { displayName: nick });
    }
  } catch (e) {
    alert("Falha no registro: " + e.message);
  }
};

$('btnLogout').onclick = async () => {
  await signOut(auth);
};

// === CRUD Paióis ===
async function loadPaiols() {
  const paiolList = $('paiolList');
  paiolList.innerHTML = '';
  const q = query(collection(db, "paiois"), orderBy("nome", "asc"));
  onSnapshot(q, (snap) => {
    paiolList.innerHTML = '';
    snap.forEach(docSnap => {
      const paiol = docSnap.data();
      const div = document.createElement('div');
      div.className = 'paiol-card';
      div.innerHTML = `
        <h3>${escapeHtml(paiol.nome)}</h3>
        <p>Temp Atual: ${paiol.tempAtual ?? '-'}°C</p>
        <p>Máx: ${paiol.tempMax ?? '-'}°C | Mín: ${paiol.tempMin ?? '-'}°C</p>
        <p>Umidade: ${paiol.umid ?? '-'}%</p>
        <p>Lacre: ${escapeHtml(paiol.lacre ?? '-')}</p>
        <button onclick="editPaiol('${docSnap.id}')">Editar</button>
        <button onclick="removePaiol('${docSnap.id}')">Remover</button>
        <button onclick="showHistoryForPaiol('${docSnap.id}')">Histórico</button>
      `;
      paiolList.appendChild(div);
    });
  });
}

window.addPaiol = async () => {
  const nome = prompt("Nome do Paiol:");
  if (!nome) return;
  await addDoc(collection(db, "paiois"), {
    nome,
    tempAtual: null,
    tempMax: null,
    tempMin: null,
    umid: null,
    lacre: ""
  });
};

window.removePaiol = async (id) => {
  if (!confirm("Remover paiol?")) return;
  await deleteDoc(doc(db, "paiois", id));
};

window.editPaiol = async (id) => {
  currentEdit = id;
  window.currentEdit = id;
  const snap = await getDocs(query(collection(db, "paiois"), where("__name__", "==", id)));
  snap.forEach(d => {
    const p = d.data();
    $('editNome').value = p.nome;
    $('editTempAtual').value = p.tempAtual ?? "";
    $('editTempMax').value = p.tempMax ?? "";
    $('editTempMin').value = p.tempMin ?? "";
    $('editUmid').value = p.umid ?? "";
    $('editLacre').value = p.lacre ?? "";
  });
  $('editor').style.display = 'block';
  $('listArea').style.display = 'none';
  $('histArea').style.display = 'none';
};

$('btnSaveEdit').onclick = async () => {
  const id = currentEdit;
  if (!id) return;
  const ref = doc(db, "paiois", id);
  const data = {
    nome: $('editNome').value,
    tempAtual: Number($('editTempAtual').value),
    tempMax: Number($('editTempMax').value),
    tempMin: Number($('editTempMin').value),
    umid: Number($('editUmid').value),
    lacre: $('editLacre').value
  };
  await updateDoc(ref, data);

  // histórico
  await addDoc(collection(db, "history"), {
    paiolId: id,
    paiolName: data.nome,
    tempAtual: data.tempAtual,
    tempMax: data.tempMax,
    tempMin: data.tempMin,
    umid: data.umid,
    lacre: data.lacre,
    user: auth.currentUser?.displayName || auth.currentUser?.email,
    t: serverTimestamp()
  });

  alert("Atualizado!");
  $('editor').style.display = 'none';
  $('listArea').style.display = 'block';
};

// === Histórico ===
async function loadHistory() {
  const histTableBody = document.querySelector('#histTable tbody');
  histTableBody.innerHTML = '';
  try {
    const qh = query(collection(db, 'history'), orderBy('t', 'desc'));
    const snap = await getDocs(qh);
    snap.forEach(d => {
      const row = d.data();
      const dt = row.t?.toDate ? row.t.toDate().toLocaleString() : '—';
      const changes = [];
      if (row.tempAtual != null) changes.push('Atual: ' + row.tempAtual + '°C');
      if (row.tempMax != null) changes.push('Máx: ' + row.tempMax + '°C');
      if (row.tempMin != null) changes.push('Mín: ' + row.tempMin + '°C');
      if (row.umid != null) changes.push('Umid: ' + row.umid + '%');
      if (row.lacre) changes.push('Lacre: ' + row.lacre);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${dt}</td><td>${escapeHtml(row.paiolName)}</td><td>${escapeHtml(row.user)}</td><td>${escapeHtml(changes.join('; '))}</td>`;
      histTableBody.appendChild(tr);
    });
  } catch (e) {
    console.error("Falha ao carregar histórico:", e);
  }
}

async function loadHistoryFiltered(paiolId) {
  const histTableBody = document.querySelector('#histTable tbody');
  histTableBody.innerHTML = '';
  try {
    const qf = query(collection(db, 'history'), where('paiolId', '==', paiolId), orderBy('t', 'desc'));
    const snap = await getDocs(qf);
    snap.forEach(d => {
      const row = d.data();
      const dt = row.t?.toDate ? row.t.toDate().toLocaleString() : '—';
      const changes = [];
      if (row.tempAtual != null) changes.push('Atual: ' + row.tempAtual + '°C');
      if (row.tempMax != null) changes.push('Máx: ' + row.tempMax + '°C');
      if (row.tempMin != null) changes.push('Mín: ' + row.tempMin + '°C');
      if (row.umid != null) changes.push('Umid: ' + row.umid + '%');
      if (row.lacre) changes.push('Lacre: ' + row.lacre);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${dt}</td><td>${escapeHtml(row.paiolName)}</td><td>${escapeHtml(row.user)}</td><td>${escapeHtml(changes.join('; '))}</td>`;
      histTableBody.appendChild(tr);
    });
  } catch (e) {
    console.error("Falha ao carregar histórico filtrado:", e);
  }
}

async function showHistoryForPaiol(paiolId) {
  histFilterPaiolId = paiolId;
  window.histFilterPaiolId = paiolId;
  currentEdit = paiolId;
  window.currentEdit = paiolId;
  setActiveTab('hist');
  await loadHistoryFiltered(paiolId);
}
window.showHistoryForPaiol = showHistoryForPaiol;

// === Tabs ===
$('tabHist').addEventListener('click', () => {
  setActiveTab('hist');
  histFilterPaiolId = null;
  window.histFilterPaiolId = null;
  window.currentEdit = null;
  loadHistory(); // histórico completo
});

$('tabPanel').addEventListener('click', () => {
  setActiveTab('panel');
});

// === Exportação CSV ===
window.exportHistoryCSV = async (all = true) => {
  try {
    let qh;
    if (all) {
      qh = query(collection(db, 'history'), orderBy('t', 'desc'));
    } else {
      const pid = histFilterPaiolId || currentEdit || window.currentEdit;
      if (!pid) {
        alert("Abra o histórico de um paiol antes de exportar filtrado.");
        return;
      }
      qh = query(collection(db, 'history'), where('paiolId', '==', pid), orderBy('t', 'desc'));
    }
    const snap = await getDocs(qh);
    let csv = "Data,Paiol,Usuário,Alterações\n";
    snap.forEach(d => {
      const row = d.data();
      const dt = row.t?.toDate ? row.t.toDate().toLocaleString() : '—';
      const changes = [];
      if (row.tempAtual != null) changes.push('Atual: ' + row.tempAtual + '°C');
      if (row.tempMax != null) changes.push('Máx: ' + row.tempMax + '°C');
      if (row.tempMin != null) changes.push('Mín: ' + row.tempMin + '°C');
      if (row.umid != null) changes.push('Umid: ' + row.umid + '%');
      if (row.lacre) changes.push('Lacre: ' + row.lacre);
      csv += `"${dt}","${row.paiolName}","${row.user}","${changes.join('; ')}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = all ? "historico_completo.csv" : `historico_${histFilterPaiolId || currentEdit}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert("Falha ao exportar histórico: " + (e.message || e));
  }
};
