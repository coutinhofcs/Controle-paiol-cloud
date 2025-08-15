Controle de Paiol - Pacote final
===============================

O pacote contém um front-end pronto para uso com seu Firebase.

Passos rápidos:
1. Faça deploy dos arquivos (index.html, manifest.webmanifest, sw.js, pasta icons) em um host HTTPS (GitHub Pages, Firebase Hosting, Vercel).
2. No Firebase Console > Authentication: ative 'Sign-in method' Email/Password.
3. No Firebase Console > Firestore: crie database (modo produção) e publique as regras em FIRESTORE_RULES.txt.
4. Em Project Settings > General > Your apps: verifique se o domínio do site está em 'Authorized domains'.
5. Acesse o app: registre usuários e, no primeiro login, escolha um apelido (displayName) que será usado no histórico.

Config inserido abaixo:
{
  "firebaseConfig": {
    "apiKey": "AIzaSyAYvkpAe9Nfnn53JlSg8vOrKUFmUHn6oek",
    "authDomain": "controle-de-paiol.firebaseapp.com",
    "projectId": "controle-de-paiol",
    "storageBucket": "controle-de-paiol.firebasestorage.app",
    "messagingSenderId": "202438664461",
    "appId": "1:202438664461:web:c60d98f85fe8ab2ece9044",
    "measurementId": "G-BD3BR04LJQ"
  }
}