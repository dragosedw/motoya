// src/auth/auth.js
import { auth } from "./modules/init.js";

export async function obtenerRepartidorUID() {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      unsubscribe(); // evitamos múltiple suscripciones
      if (user) {
        resolve(user.uid);
      } else {
        reject("Usuario no autenticado");
      }
    });
  });
}
