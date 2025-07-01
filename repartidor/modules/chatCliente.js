// src/chat/chatCliente.js

import { db } from "../modules/init.js";

export async function cargarMensajes(idPedido, contenedor) {
  const chatRef = db.collection("pedidos").doc(idPedido).collection("chat");

  const snapshot = await chatRef.orderBy("timestamp", "asc").get();
  contenedor.innerHTML = "";

  snapshot.forEach(doc => {
    const msg = doc.data();
    contenedor.innerHTML += `
      <div class="${msg.de === 'cliente' ? 'msg-cliente' : 'msg-repartidor'}">
        ${msg.texto}
      </div>
    `;
  });
}

export async function enviarMensaje(idPedido, texto) {
  const chatRef = db.collection("pedidos").doc(idPedido).collection("chat");

  await chatRef.add({
    texto,
    de: "repartidor",
    timestamp: new Date()
  });
}
