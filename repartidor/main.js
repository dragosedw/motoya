// src/main.js

import { obtenerRepartidorUID } from "./auth/auth.js";
import { configurarTabs } from "./ui/tabs.js";
import { db } from "./firebase/init.js";
import { crearCardPedido } from "./ui/cardPedido.js";
import { generarBotonEntregar, escucharBotonesEntregar } from "./pedidos/activos.js";
import { iniciarRastreoGPS } from "./gps/ubicacion.js";
import { iniciarChatAdmin } from "./chat/chatAdmin.js";

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

initApp();
