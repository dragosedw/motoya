// Inicialización Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBZk3Surd5Xyjj-58gInYk5VD8CB2xguME",
  authDomain: "motoya-cd83b.firebaseapp.com",
  projectId: "motoya-cd83b",
  storageBucket: "motoya-cd83b.appspot.com",
  messagingSenderId: "524670121243",
  appId: "1:524670121243:web:72f3dcc70d0a38b3f10fbe"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Detectar autenticación y asignar UID del administrador
auth.onAuthStateChanged(user => {
  if (user) {
    adminUid = user.uid;
    console.log("Administrador autenticado:", adminUid);
  } else {
    console.warn("Administrador no autenticado.");
  }
});