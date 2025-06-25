
// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBZk3Surd5Xyjj-58gInYk5VD8CB2xguME",
  authDomain: "motoya-cd83b.firebaseapp.com",
  projectId: "motoya-cd83b",
  storageBucket: "motoya-cd83b.appspot.com",
  messagingSenderId: "524670121243",
  appId: "1:524670121243:web:72f3dcc70d0a38b3f10fbe"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
let uid = null;
let watchId = null;
let repartidorNombre = "Repartidor";

// Tabs
function mostrarTab(tab) {
  document.getElementById("tabActivos").classList.toggle("border-b-2", tab === "activos");
  document.getElementById("tabActivos").classList.toggle("border-red-600", tab === "activos");
  document.getElementById("tabActivos").classList.toggle("text-red-600", tab === "activos");
  document.getElementById("tabActivos").classList.toggle("text-gray-600", tab !== "activos");

  document.getElementById("tabEntregados").classList.toggle("border-b-2", tab === "entregados");
  document.getElementById("tabEntregados").classList.toggle("border-red-600", tab === "entregados");
  document.getElementById("tabEntregados").classList.toggle("text-red-600", tab === "entregados");
  document.getElementById("tabEntregados").classList.toggle("text-gray-600", tab !== "entregados");

  document.getElementById("panelActivos").classList.toggle("hidden", tab !== "activos");
  document.getElementById("panelEntregados").classList.toggle("hidden", tab !== "entregados");
}

// Inicialmente mostrar activos
document.addEventListener("DOMContentLoaded", () => mostrarTab("activos"));

// Autenticación y carga de datos
firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  uid = user.uid;

  try {
    const doc = await db.collection("usuarios").doc(uid).get();

    if (!doc.exists) {
      await firebase.auth().signOut();
      window.location.href = "../index.html";
      return;
    }

    const data = doc.data();

    if (data.tipo !== "repartidor") {
      await firebase.auth().signOut();
      window.location.href = "../index.html";
      return;
    }

    if (!data.aprobado) {
      document.getElementById("contenido").classList.add("hidden");
      document.getElementById("mensajeNoAprobado").classList.remove("hidden");
      return;
    }

    repartidorNombre = data.nombre ? data.nombre + (data.apellido ? " " + data.apellido : "") : "Repartidor";

    document.getElementById("contenido").classList.remove("hidden");
    document.getElementById("mensajeNoAprobado").classList.add("hidden");

    await contarPedidosHoy();
    await cargarPedidosAsignados();
    await cargarPedidosEntregados();
    iniciarRastreoGPS();

    // Iniciar escucha de chat con admin
    setTimeout(escucharChatAdmin, 1000);

  } catch (error) {
    console.error("Error validando usuario:", error);
    alert("Error al validar usuario. Intenta nuevamente.");
    await firebase.auth().signOut();
    window.location.href = "../index.html";
  }
});

// Contar pedidos entregados hoy
async function contarPedidosHoy() {
  const contador = document.getElementById("contadorPedidosHoy");
  try {
    const ahora = new Date();
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const finDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);

    const pedidosHoySnap = await db.collection("pedidos")
      .where("uidRepartidor", "==", uid)
      .where("estado", "==", "entregado")
      .where("fecha", ">=", inicioDia)
      .where("fecha", "<=", finDia)
      .get();

    contador.textContent = `Pedidos entregados hoy: ${pedidosHoySnap.size}`;
  } catch (error) {
    console.error("Error al contar pedidos:", error);
    contador.textContent = "Error al cargar el conteo.";
  }
}

// Pedidos activos (asignado/en camino)
async function cargarPedidosAsignados() {
  const container = document.getElementById("pedidosContainer");
  container.innerHTML = "";

  try {
    const pedidosSnap = await db.collection("pedidos")
      .where("uidRepartidor", "==", uid)
      .orderBy("asignadoEn", "desc")
      .get();

    if (pedidosSnap.empty) {
      container.innerHTML = "<p class='text-gray-500'>No tienes pedidos asignados.</p>";
      return;
    }

    const uidsClientes = [...new Set(pedidosSnap.docs.map(doc => doc.data().uidCliente).filter(Boolean))];
    const clientesMap = new Map();

    if (uidsClientes.length) {
      const clientesPromises = uidsClientes.map(uidCliente => db.collection("usuarios").doc(uidCliente).get());
      const clientesDocs = await Promise.all(clientesPromises);

      clientesDocs.forEach(doc => {
        if (doc.exists) {
          clientesMap.set(doc.id, doc.data());
        }
      });
    }

    pedidosSnap.forEach(doc => {
      const pedido = doc.data();
      // Solo mostrar activos
      if (pedido.estado !== "asignado" && pedido.estado !== "en camino") return;
      const cliente = clientesMap.get(pedido.uidCliente) || {};

      const card = crearCardPedido(doc.id, pedido, cliente, false);
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Error al cargar pedidos:", error);
    container.innerHTML = `<p class="text-red-600">Error al cargar pedidos: ${error.message}</p>`;
  }
}

// Pedidos entregados (no ocultos)
async function cargarPedidosEntregados() {
  const container = document.getElementById("pedidosEntregadosContainer");
  container.innerHTML = "";
  let totalComisiones = 0;

  try {
    const pedidosSnap = await db.collection("pedidos")
      .where("uidRepartidor", "==", uid)
      .where("estado", "==", "entregado")
      .orderBy("fecha", "desc")
      .get();

    if (pedidosSnap.empty) {
      container.innerHTML = "<p class='text-gray-500'>No tienes pedidos entregados.</p>";
      document.getElementById("resumenComisiones").textContent = "";
      return;
    }

    const uidsClientes = [...new Set(pedidosSnap.docs.map(doc => doc.data().uidCliente).filter(Boolean))];
    const clientesMap = new Map();

    if (uidsClientes.length) {
      const clientesPromises = uidsClientes.map(uidCliente => db.collection("usuarios").doc(uidCliente).get());
      const clientesDocs = await Promise.all(clientesPromises);

      clientesDocs.forEach(doc => {
        if (doc.exists) {
          clientesMap.set(doc.id, doc.data());
        }
      });
    }

    pedidosSnap.forEach(doc => {
      const pedido = doc.data();
      if (pedido.ocultoRepartidor === true) return; // Ocultar si fue ocultado
      if (typeof pedido.comision === "number" && pedido.comisionPagada !== true && pedido.comisionPagada !== "true") {
        totalComisiones += pedido.comision;
      }
      const cliente = clientesMap.get(pedido.uidCliente) || {};
      const card = crearCardPedido(doc.id, pedido, cliente, true);
      container.appendChild(card);
    });

    document.getElementById("resumenComisiones").textContent =
      `Comisiones por pagar: $${totalComisiones.toFixed(2)}`;

  } catch (error) {
    console.error("Error al cargar pedidos entregados:", error);
    container.innerHTML = `<p class="text-red-600">Error al cargar pedidos entregados: ${error.message}</p>`;
  }
}

// Crear tarjeta de pedido (activos o entregados)
function crearCardPedido(pedidoId, pedido, cliente, esEntregado) {
  const div = document.createElement("div");
  div.className = "bg-white shadow-md p-4 rounded";

  const nombreCliente = cliente.nombre && cliente.apellido ? `${cliente.nombre} ${cliente.apellido}` :
    (pedido.nombreCliente || "Desconocido");
  const telefonoCliente = cliente.telefono || pedido.telefonoCliente || "No disponible";
  const descripcion = pedido.descripcion || "Sin descripción";

  let acciones = "";
  if (!esEntregado) {
    if (pedido.estado === "asignado") {
      acciones = `<button onclick="cambiarEstado('${pedidoId}', 'en camino')" class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition w-full sm:w-auto">
      <i class="fas fa-truck mr-2"></i> En camino
    </button>`;
    } else if (pedido.estado === "en camino") {
      acciones = `<button onclick="cambiarEstado('${pedidoId}', 'entregado')" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition w-full sm:w-auto">
      <i class="fas fa-check mr-2"></i> Entregado
    </button>`;
    }
  } else {
    if ((pedido.comisionPagada === true || pedido.comisionPagada === "true") && pedido.ocultoRepartidor !== true) {
      acciones = `<button onclick="ocultarPedidoEntregado('${pedidoId}')" class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition w-full sm:w-auto">
      <i class="fas fa-eye-slash mr-2"></i> Ocultar (ya pagué comisión)
    </button>`;
    } else if ((pedido.comisionPagada === true || pedido.comisionPagada === "true") && pedido.ocultoRepartidor === true) {
      acciones = `<span class="text-gray-500 font-semibold">Pagado y oculto</span>`;
    } else {
      acciones = `<span class="text-yellow-700 font-semibold">Esperando confirmación de pago por el administrador</span>`;
    }
  }

  // Costo y comisión
  const costoComision = `
    <div class="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2 text-sm">
      <span class="text-gray-700 font-medium whitespace-nowrap">Costo: <span class="text-green-700">$${pedido.total?.toFixed(2) || "0.00"}</span></span>
      <span class="text-gray-700 font-medium whitespace-nowrap">Comisión: <span class="text-red-700">$${pedido.comision?.toFixed(2) || "0.00"}</span></span>
    </div>
  `;

  // Ubicación en tiempo real (solo en activos y si hay cliente)
  let ubicacionHTML = "";
  if (!esEntregado && pedido.uidCliente) {
    ubicacionHTML = `
      <button onclick="verUbicacionTiempoRealCliente('${pedido.uidCliente}')" class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 mt-2">
        <i class="fas fa-map-pin mr-1"></i> Ver ubicación en tiempo real
      </button>
    `;
  }

  // Chat solo si hay cliente asignado
  let chatHTML = "";
  if (pedido.uidCliente) {
    chatHTML = `
      <div id="chatPedido_${pedidoId}" class="border-t mt-4 pt-2">
        <h3 class="font-semibold mb-2">Chat con cliente</h3>
        <div id="mensajesChat_${pedidoId}" class="h-40 overflow-y-auto bg-gray-50 p-2 mb-2 rounded border"></div>
        <form onsubmit="enviarMensajeChat('${pedidoId}'); return false;" class="flex">
          <input id="inputChat_${pedidoId}" class="flex-1 border rounded px-2 py-1 mr-2" placeholder="Escribe un mensaje..." autocomplete="off" />
          <button type="submit" class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Enviar</button>
        </form>
      </div>
    `;
  }

  div.innerHTML = `
    <h2 class="text-lg font-semibold mb-1">${nombreCliente}</h2>
    <p class="text-gray-700 mb-1"><i class="fas fa-phone mr-2 text-red-600"></i> ${telefonoCliente}</p>
    <p class="text-gray-700 mb-1"><i class="fas fa-map-marker-alt mr-2 text-red-600"></i> ${pedido.direccion || "Sin dirección"}</p>
    <p class="text-gray-700 mb-2"><strong>Descripción:</strong> ${descripcion}</p>
    <p class="font-medium mb-1">Estado: <span class="capitalize">${pedido.estado}</span></p>
    ${costoComision}
    ${ubicacionHTML}
    <div class="mt-3">
      ${acciones}
    </div>
    ${chatHTML}
  `;

  // Inicializar escucha de chat si hay cliente
  if (pedido.uidCliente) {
    setTimeout(() => escucharChat(pedidoId), 500);
  }

  return div;
}

// FUNCIÓN: Ver ubicación en tiempo real del cliente
async function verUbicacionTiempoRealCliente(uidCliente) {
  try {
    const doc = await db.collection("usuarios").doc(uidCliente).get();
    if (!doc.exists) {
      alert("No se encontró información del cliente.");
      return;
    }
    const ubicacion = doc.data().ubicacionTiempoReal;
    if (ubicacion && ubicacion.lat && ubicacion.lng) {
      window.open(`https://maps.google.com/?q=${ubicacion.lat},${ubicacion.lng}`, '_blank');
    } else {
      alert("El cliente no ha compartido su ubicación en tiempo real.");
    }
  } catch (error) {
    console.error("Error al obtener ubicación del cliente:", error);
    alert("Error al obtener ubicación del cliente.");
  }
}

// CHAT: Escuchar mensajes en tiempo real para un pedido
function escucharChat(pedidoId) {
  const mensajesDiv = document.getElementById("mensajesChat_" + pedidoId);
  if (!mensajesDiv) return;

  db.collection("pedidos")
    .doc(pedidoId)
    .collection("chat")
    .orderBy("timestamp")
    .onSnapshot((snapshot) => {
      mensajesDiv.innerHTML = "";
      snapshot.forEach((doc) => {
        const m = doc.data();
        const claseMensaje = m.uidEmisor === uid ? "text-right" : "text-left";
        mensajesDiv.innerHTML += `<div class="${claseMensaje} mb-1"><b>${escapeHtml(m.nombreEmisor)}:</b> ${escapeHtml(m.texto)}</div>`;
      });
      mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
    });
}

// CHAT: Enviar mensaje al chat de un pedido
function enviarMensajeChat(pedidoId) {
  const input = document.getElementById("inputChat_" + pedidoId);
  const texto = input.value.trim();
  if (!texto) return;
  db.collection("pedidos")
    .doc(pedidoId)
    .collection("chat")
    .add({
      texto,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      uidEmisor: uid,
      nombreEmisor: repartidorNombre,
    });
  input.value = "";
}

// CHAT: Escapar texto para evitar inyección HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Cambiar estado del pedido con confirmación
async function cambiarEstado(pedidoId, nuevoEstado) {
  const confirmacion = confirm(`¿Deseas cambiar el estado del pedido a "${nuevoEstado}"?`);
  if (!confirmacion) return;

  try {
    await db.collection("pedidos").doc(pedidoId).update({ estado: nuevoEstado });
    alert(`Estado actualizado a: ${nuevoEstado}`);
    await contarPedidosHoy();
    await cargarPedidosAsignados();
    await cargarPedidosEntregados();
  } catch (error) {
    alert("Error al actualizar estado");
    console.error(error);
  }
}

// Ocultar pedido entregado (marcar como oculto para el repartidor)
async function ocultarPedidoEntregado(pedidoId) {
  if (!confirm("¿Confirmas que pagaste la comisión al administrador y quieres ocultar este pedido?")) return;
  try {
    await db.collection("pedidos").doc(pedidoId).update({ ocultoRepartidor: true });
    alert("Pedido ocultado de tu lista de entregados.");
    await cargarPedidosEntregados();
  } catch (error) {
    alert("Error al ocultar el pedido.");
    console.error(error);
  }
}

// Iniciar rastreo GPS con watchPosition para mejor eficiencia
function iniciarRastreoGPS() {
  if (!("geolocation" in navigator)) {
    alert("La geolocalización no está disponible en este dispositivo.");
    return;
  }

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }

  watchId = navigator.geolocation.watchPosition(async (pos) => {
    try {
      await db.collection("usuarios").doc(uid).update({
        ubicacion: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          actualizado: firebase.firestore.FieldValue.serverTimestamp()
        }
      });
    } catch (error) {
      console.error("Error actualizando ubicación:", error);
    }
  }, (err) => {
    console.error("Error obteniendo ubicación:", err);
  }, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 10000
  });
}

// Logout
function logout() {
  firebase.auth().signOut()
    .then(() => window.location.href = "../index.html")
    .catch(error => alert("Error al cerrar sesión: " + error.message));
}

// --- CHAT CON ADMINISTRADOR (flotante para repartidor) ---
function abrirChatAdmin() {
  document.getElementById("chatAdminBox").classList.remove("hidden");
  document.getElementById("chatAdminBtn").classList.add("hidden");
  marcarMensajesLeidosAdmin();
  setTimeout(() => {
    document.getElementById("inputChatAdmin").focus();
  }, 200);
}
function cerrarChatAdmin() {
  document.getElementById("chatAdminBox").classList.add("hidden");
  document.getElementById("chatAdminBtn").classList.remove("hidden");
}

let chatAdminUnsub = null;
let ultimoTimestampLeido = null;
let ultimoMsPrevio = 0;
function escucharChatAdmin() {
  if (!uid) return;
  if (chatAdminUnsub) chatAdminUnsub(); // Detener anterior
  const mensajesDiv = document.getElementById("mensajesChatAdmin");
  const chatBtn = document.getElementById("chatAdminBtn");
  const chatAlertAudio = document.getElementById("chatAlertAudio");

  ultimoTimestampLeido = Number(localStorage.getItem("chatAdminUltLeido") || 0);
  ultimoMsPrevio = Number(localStorage.getItem("chatAdminUltMs") || 0);

  chatAdminUnsub = db.collection("chats_admin")
    .doc(uid)
    .collection("mensajes")
    .orderBy("timestamp")
    .onSnapshot(snapshot => {
      mensajesDiv.innerHTML = "";
      let hayNoLeido = false;
      let ultimoMs = 0;
      let mensajeNuevo = false;

      snapshot.forEach(doc => {
        const m = doc.data();
        const clase = m.uidEmisor === uid ? "text-right" : "text-left";
        mensajesDiv.innerHTML += `<div class="${clase} mb-1"><b>${escapeHtml(m.nombreEmisor)}:</b> ${escapeHtml(m.texto)}</div>`;
        if (m.uidEmisor !== uid && m.timestamp && m.timestamp.toMillis) {
          const ms = m.timestamp.toMillis();
          if (ms > ultimoTimestampLeido) hayNoLeido = true;
          if (ms > ultimoMs) ultimoMs = ms;
          if (ms > ultimoMsPrevio) mensajeNuevo = true;
        }
      });
      mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
      if (hayNoLeido) {
        chatBtn.classList.add("noti");
        if (mensajeNuevo && document.getElementById("chatAdminBox").classList.contains("hidden")) {
          try { chatAlertAudio.play(); } catch(e){}
        }
      } else {
        chatBtn.classList.remove("noti");
      }
      if (ultimoMs > 0) {
        localStorage.setItem("chatAdminUltMs", ultimoMs);
        ultimoMsPrevio = ultimoMs;
      }
    });
}

function marcarMensajesLeidosAdmin() {
  const ultimoMs = Number(localStorage.getItem("chatAdminUltMs") || 0);
  if (ultimoMs > 0) {
    localStorage.setItem("chatAdminUltLeido", ultimoMs);
    document.getElementById("chatAdminBtn").classList.remove("noti");
  }
}

function enviarMensajeChatAdmin() {
  const input = document.getElementById("inputChatAdmin");
  const texto = input.value.trim();
  if (!texto || !uid) return;
  db.collection("chats_admin")
    .doc(uid)
    .collection("mensajes")
    .add({
      texto,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      uidEmisor: uid,
      nombreEmisor: repartidorNombre
    });
  input.value = "";
  setTimeout(marcarMensajesLeidosAdmin, 400);
}
// --- FIN CHAT CON ADMINISTRADOR ---

