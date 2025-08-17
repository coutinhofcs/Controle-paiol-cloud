import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import { 
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, signOut, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { 
  getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, 
  serverTimestamp, updateDoc, getDoc, getDocs, query, orderBy, where 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
window.db = db;
window.auth = auth;
let currentEdit = null;
window.currentEdit = null;

const $ = id => document.getElementById(id);

// ----------------- AUTENTICAÇÃO -----------------

$("loginBtn").addEventListener("click", async () => {
  const email = $("loginEmail").value;
  const pass = $("loginPass").value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    alert("Erro ao entrar: " + err.message);
  }
});

$("registerBtn").addEventListener("click", async () => {
  const email = $("regEmail").value;
  const pass = $("regPass").value;
  const nick = $("regNick").value;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: nick });
  } catch (err) {
    alert("Erro ao registrar: " + err.message);
  }
});

$("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
});

// ----------------- ESTADO DO USUÁRIO -----------------

onAuthStateChanged(auth, user => {
  if (user) {
    $("loginScreen").style.display = "none";
    $("appScreen").style.display = "block";
    $("userNick").innerText = user.displayName || user.email;
    startListeners();
  } else {
    $("loginScreen").style.display = "block";
    $("appScreen").style.display = "none";
  }
});

// ----------------- LISTAGEM E CRUD DE PAIÓIS -----------------

function startListeners() {
  const qPaiol = query(collection(db, "paiois"), orderBy("nome", "asc"));
  onSnapshot(qPaiol, snapshot => {
    const list = $("paiolList");
    list.innerHTML = "";
    snapshot.forEach(docSnap => {
      const p = docSnap.data();
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${p.nome}</strong><br>
        🌡️ Atual: ${p.tempAtual || "-"}°C | Min: ${p.tempMin || "-"}°C | Máx: ${p.tempMax || "-"}°C<br>
        💧 Umidade: ${p.umidade || "-"}%<br>
        🔒 Lacre: ${p.lacre || "-"}<br>
        <button class="editBtn">Editar</button>
        <button class="histBtn">Histórico</button>
        <button class="delBtn">Excluir</button>
      `;

      li.querySelector(".editBtn").onclick = () => openEditor(docSnap.id, p);
      li.querySelector(".histBtn").onclick = () => showHistoryForPaiol(docSnap.id);
      li.querySelector(".delBtn").onclick = () => deleteDoc(doc(db, "paiois", docSnap.id));

      list.appendChild(li);
    });
  });
}

// ----------------- EDITAR PAIOL -----------------

function openEditor(id, data) {
  currentEdit = id;
  window.currentEdit = id;
  $("editor").style.display = "block";
  $("listArea").style.display = "none";
  $("histArea").style.display = "none";
  $("tabPanel").classList.add("active");
  $("tabHist").classList.remove("active");

  $("edNome").value = data.nome || "";
  $("edTempAtual").value = data.tempAtual || "";
  $("edTempMin").value = data.tempMin || "";
  $("edTempMax").value = data.tempMax || "";
  $("edUmidade").value = data.umidade || "";
  $("edLacre").value = data.lacre || "";
}

$("saveEdBtn").addEventListener("click", async () => {
  if (!currentEdit) return;
  const ref = doc(db, "paiois", currentEdit);
  const user = auth.currentUser;
  await updateDoc(ref, {
    nome: $("edNome").value,
    tempAtual: $("edTempAtual").value,
    tempMin: $("edTempMin").value,
    tempMax: $("edTempMax").value,
    umidade: $("edUmidade").value,
    lacre: $("edLacre").value,
    lastUser: user.displayName || user.email,
    lastUpdate: serverTimestamp()
  });

  // histórico
  await addDoc(collection(db, "history"), {
    paiolId: currentEdit,
    nome: $("edNome").value,
    tempAtual: $("edTempAtual").value,
    tempMin: $("edTempMin").value,
    tempMax: $("edTempMax").value,
    umidade: $("edUmidade").value,
    lacre: $("edLacre").value,
    user: user.displayName || user.email,
    t: serverTimestamp()
  });

  $("editor").style.display = "none";
  $("listArea").style.display = "block";
  currentEdit = null;
  window.currentEdit = null;
});

// ----------------- ADICIONAR PAIOL -----------------

$("addPaiolBtn").addEventListener("click", async () => {
  const nome = prompt("Nome do paiol:");
  if (!nome) return;
  await addDoc(collection(db, "paiois"), { nome });
});

// ----------------- HISTÓRICO -----------------

async function showHistoryForPaiol(paiolId) {
  $("tabHist").classList.add("active");
  $("tabPanel").classList.remove("active");
  $("editor").style.display = "none";
  $("listArea").style.display = "none";
  $("histArea").style.display = "block";

  currentEdit = paiolId;
  window.currentEdit = paiolId;

  const qHist = query(
    collection(db, "history"),
    where("paiolId", "==", paiolId),
    orderBy("t", "desc")
  );

  const snap = await getDocs(qHist);
  const table = $("histTable");
  table.innerHTML = "<tr><th>Paiol</th><th>Temp Atual</th><th>Min</th><th>Máx</th><th>Umidade</th><th>Lacre</th><th>Usuário</th><th>Data</th></tr>";
  snap.forEach(docSnap => {
    const h = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${h.nome}</td>
      <td>${h.tempAtual}</td>
      <td>${h.tempMin}</td>
      <td>${h.tempMax}</td>
      <td>${h.umidade}</td>
      <td>${h.lacre}</td>
      <td>${h.user}</td>
      <td>${h.t?.toDate ? h.t.toDate().toLocaleString() : ""}</td>
    `;
    table.appendChild(tr);
  });
}

// ----------------- EXPORTAÇÃO -----------------

async function exportHistoryCSV(all = true) {
  try {
    const _db = (typeof db !== "undefined") ? db : window.db;
    const _currentEdit = (typeof currentEdit !== "undefined" && currentEdit) ? currentEdit : window.currentEdit;

    let qHist;
    if (all) {
      qHist = query(collection(_db, "history"), orderBy("t", "desc"));
    } else {
      if (!_currentEdit) {
        alert("Abra o histórico de um paiol antes de exportar filtrado.");
        return;
      }
      qHist = query(collection(_db, "history"), where("paiolId", "==", _currentEdit), orderBy("t", "desc"));
    }

    const snap = await getDocs(qHist);
    let csv = "Paiol,Temp Atual,Min,Max,Umidade,Lacre,Usuário,Data\n";
    snap.forEach(docSnap => {
      const h = docSnap.data();
      csv += `${h.nome},${h.tempAtual},${h.tempMin},${h.tempMax},${h.umidade},${h.lacre},${h.user},${h.t?.toDate ? h.t.toDate().toISOString() : ""}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = all ? "historico_todos.csv" : `historico_${_currentEdit}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Falha ao exportar histórico: " + err.message);
  }
}

$("btnExportCsv").onclick = () => exportHistoryCSV(true);
$("btnExportCsvPaiol").onclick = () => exportHistoryCSV(false);
