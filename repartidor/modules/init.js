import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";

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

const auth = firebase.auth();
const db = firebase.firestore();

export { firebase, auth, db };
