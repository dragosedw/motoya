// src/chat/chatAdmin.js

import { db } from "../modules/init.js";

export function iniciarChatAdmin(uidRepartidor) {
  const chatBox = document.getElementById("chat-admin");
  const input = document.getElementById("chat-admin-input");
  const btn = document.getElementById("chat-admin-btn");

  // Escuchar mensajes nuevos
  db.collection("adminChat").doc(uidRepartidor)
    .collection("mensajes")
    .orderBy("timestamp")
    .onSnapshot(snapshot => {
      chatBox.innerHTML = "";
      snapshot.forEach(doc => {
        const msg = doc.data();
        chatBox.innerHTML += `
          <div class="${msg.de === 'admin' ? 'msg-admin' : 'msg-repartidor'}">
            ${msg.texto}
          </div>
        `;
      });
    });

  // Enviar mensaje
  btn.addEventListener("click", async () => {
    const texto = input.value.trim();
    if (!texto) return;

    await db.collection("adminChat").doc(uidRepartidor)
      .collection("mensajes").add({
        texto,
        de: "repartidor",
        timestamp: new Date()
      });

    input.value = "";
  });
}
