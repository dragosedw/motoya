// auth.js
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

function recuperarContrasena() {
  const email = document.getElementById("emailRecuperar").value.trim();

  if (!email) {
    alert("Por favor, ingresa tu correo electrónico.");
    return;
  }

  firebase.auth().sendPasswordResetEmail(email)
    .then(() => {
      alert("Se ha enviado un enlace para restablecer la contraseña.");
    })
    .catch((error) => {
      alert("Error: " + error.message);
    });
}
