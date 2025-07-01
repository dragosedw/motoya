// src/main.js

import { obtenerRepartidorUID } from "./modules/auth.js";
import { configurarTabs } from "./modules/tabs.js";
import { db } from "./modules/init.js";
import { crearCardPedido } from "./modules/cardpedido.js";
import { generarBotonEntregar, escucharBotonesEntregar } from "./modules/pedidosactivos.js";
import { iniciarRastreoGPS } from "./modules/ubicacion.js";
import { iniciarChatAdmin } from "./modules/chatAdmin.js";
import { iniciarChatCliente } from "./modules/chatCliente.js";

async function initApp() {
  try {
    const uid = await obtenerRepartidorUID();
    iniciarRastreoGPS(uid);
    iniciarChatAdmin(uid);

    configurarTabs({
      onActivos: () => cargarPedidos(uid, "activo"),
      onEntregados: () => cargarPedidos(uid, "entregado")
    });

    cargarPedidos(uid, "activo");
  } catch (err) {
    console.error("Error:", err);
  }
}

async function cargarPedidos(uid, estado) {
  const contenedor = document.getElementById("contenedor-pedidos");
  contenedor.innerHTML = "<p>Cargando...</p>";

  try {
    const snapshot = await db.collection("pedidos")
      .where("repartidor", "==", uid)
      .where("estado", "==", estado)
      .get();

    contenedor.innerHTML = "";

    snapshot.forEach(doc => {
      const pedido = doc.data();
      const acciones = estado === "activo" ? generarBotonEntregar(doc.id) : "";
      contenedor.innerHTML += crearCardPedido(pedido, acciones);
    });

    if (estado === "activo") escucharBotonesEntregar();
  } catch (err) {
    contenedor.innerHTML = "<p>Error al cargar pedidos.</p>";
  }
}

window.mostrarTab = (tab) => {
  const panelActivos = document.getElementById("panelActivos");
  const panelEntregados = document.getElementById("panelEntregados");
  const tabActivos = document.getElementById("tabActivos");
  const tabEntregados = document.getElementById("tabEntregados");

  if (tab === "activos") {
    panelActivos.classList.remove("hidden");
    panelEntregados.classList.add("hidden");
    tabActivos.classList.add("border-red-600", "text-red-600");
    tabEntregados.classList.remove("border-red-600", "text-red-600");
  } else {
    panelActivos.classList.add("hidden");
    panelEntregados.classList.remove("hidden");
    tabActivos.classList.remove("border-red-600", "text-red-600");
    tabEntregados.classList.add("border-red-600", "text-red-600");
  }
};

window.abrirChatAdmin = () => {
  document.getElementById("chatAdminBox").classList.remove("hidden");
};

window.cerrarChatAdmin = () => {
  document.getElementById("chatAdminBox").classList.add("hidden");
};

window.logout = () => {
  firebase.auth().signOut().then(() => {
    location.href = "index.html";
  });
};

window.enviarMensajeChatAdmin = () => {
  const input = document.getElementById("inputChatAdmin");
  const mensaje = input.value.trim();
  if (mensaje === "") return;

  const mensajesChat = document.getElementById("mensajesChatAdmin");
  const div = document.createElement("div");
  div.className = "p-2 bg-red-100 rounded mb-1";
  div.textContent = mensaje;
  mensajesChat.appendChild(div);
  input.value = "";

  // Aquí puedes agregar lógica para enviar el mensaje a Firestore si quieres
};


initApp();
