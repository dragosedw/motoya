// ------------------ CONFIGURACIÓN Y VARIABLES GLOBALES ------------------
const firebaseConfig = {
  apiKey: "AIzaSyBZk3Surd5Xyjj-58gInYk5VD8CB2xguME",
  authDomain: "motoya-cd83b.firebaseapp.com",
  projectId: "motoya-cd83b",
  storageBucket: "motoya-cd83b.appspot.com",
  messagingSenderId: "524670121243",
  appId: "1:524670121243:web:72f3dcc70d0a38b3f10fbe",
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let currentUser = null;
let watchIdCliente = null;

// ------------------ UTILIDADES ------------------
const Utils = {
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },
  formatearTipoServicio(tipo) {
    if (tipo === "domicilio") return "Domicilio (moto)";
    if (tipo === "traslado") return "Traslado (torito)";
    if (tipo === "acarreo") return "Acarreo (motocarguero)";
    return "No especificado";
  },
  getEstadoColor(estado) {
    switch (estado) {
      case "pendiente":
        return "yellow";
      case "asignado":
        return "blue";
      case "en camino":
        return "purple";
      case "entregado":
        return "green";
      case "cancelado":
        return "red";
      default:
        return "gray";
    }
  },
  formatearFecha(fecha) {
    return fecha?.toDate().toLocaleString() || "Sin fecha";
  },
};

// ------------------ UI Y NAVEGACIÓN ------------------
const UI = {
  mostrarDatos(data) {
    document.getElementById("datosCliente").innerHTML = `
          <p><i class="fas fa-user mr-2"></i> <strong>Nombre:</strong> ${data.nombre} ${data.apellido}</p>
          <p><i class="fas fa-envelope mr-2"></i> <strong>Correo:</strong> ${data.email}</p>
          <p><i class="fas fa-phone mr-2"></i> <strong>Teléfono:</strong> ${data.telefono}</p>
        `;
  },
  mostrarOpcionesServicio() {
    const opcionesDiv = document.getElementById("opcionesServicio");
    opcionesDiv.innerHTML = `
          <button onclick="UI.seleccionarServicio('domicilio')" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            <i class="fas fa-motorcycle mr-2"></i> Domicilio (moto)
          </button>
          <button onclick="UI.seleccionarServicio('traslado')" class="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">
            <i class="fas fa-taxi mr-2"></i> Traslado (torito)
          </button>
          <button onclick="UI.seleccionarServicio('acarreo')" class="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800">
            <i class="fas fa-truck-moving mr-2"></i> Acarreo (motocarguero)
          </button>
        `;
    opcionesDiv.classList.remove("hidden");
    document.getElementById("btnSolicitarPedido").classList.add("hidden");
    document.getElementById("formularioPedido").classList.add("hidden");
    document.getElementById("cambiarServicioDiv").classList.add("hidden");
  },
  seleccionarServicio(tipo) {
    document.getElementById("tipoServicio").value = tipo;
    let texto = "";
    if (tipo === "domicilio") texto = "Servicio seleccionado: Domicilio (moto)";
    if (tipo === "traslado") texto = "Servicio seleccionado: Traslado (torito)";
    if (tipo === "acarreo") texto = "Servicio seleccionado: Acarreo (motocarguero)";
    document.getElementById("servicioSeleccionado").textContent = texto;
    document.getElementById("formularioPedido").classList.remove("hidden");
    document.getElementById("opcionesServicio").classList.add("hidden");
    document.getElementById("cambiarServicioDiv").classList.remove("hidden");
  },
  cambiarTipoServicio() {
    document.getElementById("tipoServicio").value = "";
    document.getElementById("servicioSeleccionado").textContent = "";
    document.getElementById("formularioPedido").classList.add("hidden");
    document.getElementById("opcionesServicio").classList.remove("hidden");
    document.getElementById("cambiarServicioDiv").classList.add("hidden");
  },
};

// ------------------ PEDIDOS ------------------
const Pedidos = {
  async enviarPedido(event) {
    event.preventDefault();
    const direccion = document.getElementById("direccion").value.trim();
    const descripcion = document.getElementById("descripcion").value.trim();
    const tipoServicio = document.getElementById("tipoServicio").value;
    const latitud = document.getElementById("latitud").value;
    const longitud = document.getElementById("longitud").value;

    if (!direccion || !descripcion || !tipoServicio) {
      alert("Por favor completa todos los campos y selecciona un servicio.");
      return;
    }

    try {
      const uid = currentUser.uid;
      const userDoc = await db.collection("usuarios").doc(uid).get();
      if (!userDoc.exists) {
        alert("No se pudieron obtener los datos del cliente.");
        return;
      }

      const userData = userDoc.data();
      const pedido = {
        uidCliente: uid,
        nombreCliente: `${userData.nombre} ${userData.apellido}`,
        telefonoCliente: userData.telefono,
        direccion,
        descripcion,
        tipoServicio,
        latitud: latitud || null,
        longitud: longitud || null,
        estado: "pendiente",
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("pedidos").add(pedido);
      alert("Pedido enviado con éxito.");
      document.getElementById("formularioPedido").classList.add("hidden");
      document.getElementById("direccion").value = "";
      document.getElementById("descripcion").value = "";
      document.getElementById("tipoServicio").value = "";
      document.getElementById("servicioSeleccionado").textContent = "";
      document.getElementById("latitud").value = "";
      document.getElementById("longitud").value = "";
      document.getElementById("ubicacionStatus").textContent = "";
      document.getElementById("btnSolicitarPedido").classList.remove("hidden");
      document.getElementById("cambiarServicioDiv").classList.add("hidden");
      Pedidos.cargarPedidos();
    } catch (error) {
      console.error("Error al enviar el pedido:", error);
      alert("Error al enviar el pedido: " + error.message);
    }
  },

  async cargarPedidos() {
    const uid = currentUser.uid;
    const pedidosLista = document.getElementById("listaPedidos");
    pedidosLista.innerHTML = "<p>Cargando pedidos...</p>";

    const mostrarOcultos = document.getElementById("mostrarPedidosOcultos")?.checked;

    try {
      const querySnapshot = await db
        .collection("pedidos")
        .where("uidCliente", "==", uid)
        .orderBy("fecha", "desc")
        .get();

      if (querySnapshot.empty) {
        pedidosLista.innerHTML = "<p>No tienes pedidos registrados.</p>";
        return;
      }

      pedidosLista.innerHTML = "";

      querySnapshot.forEach((doc) => {
        const pedido = doc.data();

        // Siempre ocultar pedidos que el cliente haya ocultado manualmente
        if (pedido.ocultoCliente === true) return;

        // Si el checkbox NO está marcado, ocultar cancelados y entregados
        if (
          !mostrarOcultos &&
          (pedido.estado === "cancelado" || pedido.estado === "entregado")
        ) {
          return;
        }

        const pedidoItem = Pedidos.crearPedidoItem(doc.id, pedido);
        pedidosLista.appendChild(pedidoItem);
      });
    } catch (error) {
      console.error("Error al cargar pedidos:", error);
      pedidosLista.innerHTML =
        "<p>Error al cargar los pedidos. Intenta nuevamente.</p>";
    }
  },

  crearPedidoItem(idPedido, pedido) {
    const div = document.createElement("div");
    div.className = `p-4 rounded shadow bg-white border-l-4 border-${Utils.getEstadoColor(
      pedido.estado
    )}-500`;

    const fechaFormateada = Utils.formatearFecha(pedido.fecha);

    let repartidorHTML = "";
    if (pedido.nombreRepartidor && pedido.telefonoRepartidor) {
      repartidorHTML = `
            <div class="mt-2 p-2 rounded bg-gray-100">
              <p><i class="fas fa-truck mr-2"></i> <strong>Repartidor:</strong> ${pedido.nombreRepartidor}</p>
              <p><i class="fas fa-phone mr-2"></i> <strong>Teléfono:</strong> ${pedido.telefonoRepartidor}</p>
            </div>
          `;
    }

    let ubicacionHTML = "";
    if (pedido.latitud && pedido.longitud) {
      ubicacionHTML = `
            <p><i class="fas fa-map-pin mr-2"></i> 
              <strong>Ubicación:</strong> 
              <a href="https://maps.google.com/?q=${pedido.latitud},${pedido.longitud}" target="_blank" class="text-blue-600 underline">
                Ver en Google Maps
              </a>
            </p>
          `;
    }

    let botonesHTML = "";
    if (pedido.estado === "pendiente" || pedido.estado === "asignado") {
      botonesHTML += `<button onclick="Pedidos.cancelarPedido('${idPedido}')" class="mt-2 bg-yellow-600 text-white px-3 py-1 rounded mr-2">
            <i class="fas fa-times mr-2"></i> Cancelar
          </button>`;
    }
    if (pedido.estado === "en camino") {
      botonesHTML += `<button onclick="Pedidos.confirmarRecibido('${idPedido}')" class="mt-2 bg-green-600 text-white px-3 py-1 rounded mr-2">
            <i class="fas fa-check mr-2"></i> Confirmar recibido
          </button>`;
    }
    if (pedido.estado === "entregado") {
      botonesHTML += `<button onclick="Pedidos.ocultarPedido('${idPedido}')" class="mt-2 bg-green-700 text-white px-3 py-1 rounded">
            <i class="fas fa-check-double mr-2"></i> Pedido recibido
          </button>`;
    }

    let chatHTML = "";
    if (pedido.uidRepartidor) {
      chatHTML = `
            <div id="chatPedido_${idPedido}" class="border-t mt-4 pt-2">
              <h3 class="font-semibold mb-2">Chat con repartidor</h3>
              <div id="mensajesChat_${idPedido}" class="h-40 overflow-y-auto bg-gray-50 p-2 mb-2 rounded border"></div>
              <form onsubmit="Pedidos.enviarMensajeChat('${idPedido}'); return false;" class="flex">
                <input id="inputChat_${idPedido}" class="flex-1 border rounded px-2 py-1 mr-2" placeholder="Escribe un mensaje..." autocomplete="off" />
                <button type="submit" class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Enviar</button>
              </form>
            </div>
          `;
    }

    div.innerHTML = `
          <p><i class="fas fa-map-marker-alt mr-2"></i> <strong>Dirección:</strong> ${pedido.direccion}</p>
          <p><i class="fas fa-cogs mr-2"></i> <strong>Servicio:</strong> ${Utils.formatearTipoServicio(pedido.tipoServicio)}</p>
          <p><i class="fas fa-info-circle mr-2"></i> <strong>Descripción:</strong> ${pedido.descripcion}</p>
          ${ubicacionHTML}
          <p><i class="fas fa-spinner fa-spin mr-2"></i> <strong>Estado:</strong> <span class="font-semibold px-2 py-1 rounded bg-${Utils.getEstadoColor(
      pedido.estado
    )}-100 text-${Utils.getEstadoColor(pedido.estado)}-800">${pedido.estado}</span></p>
          <p><i class="far fa-calendar-alt mr-2"></i> <strong>Fecha:</strong> ${fechaFormateada}</p>
          ${repartidorHTML}
          ${botonesHTML}
          ${chatHTML}
        `;

    if (pedido.uidRepartidor) {
      setTimeout(() => Pedidos.escucharChat(idPedido), 500);
    }

    return div;
  },

  obtenerUbicacion() {
    const status = document.getElementById("ubicacionStatus");
    status.textContent = "Obteniendo ubicación...";
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (position) {
          document.getElementById("latitud").value = position.coords.latitude;
          document.getElementById("longitud").value = position.coords.longitude;
          status.textContent = `Ubicación lista: Lat ${position.coords.latitude.toFixed(5)}, Lng ${position.coords.longitude.toFixed(5)}`;
        },
        function (error) {
          status.textContent = "No se pudo obtener la ubicación o fue denegada.";
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      status.textContent = "Tu navegador no soporta geolocalización.";
    }
  },

  async cancelarPedido(idPedido) {
    if (!confirm("¿Estás seguro de cancelar este pedido?")) return;
    try {
      await db.collection("pedidos").doc(idPedido).update({ estado: "cancelado" });
      await db.collection("notificaciones_admin").add({
        tipo: "cancelacion",
        mensaje: `El cliente canceló el pedido con ID: ${idPedido}`,
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        visto: false,
      });
      alert("Pedido cancelado.");
      Pedidos.cargarPedidos();
    } catch (error) {
      console.error("Error al cancelar el pedido:", error);
      alert("Error al cancelar el pedido.");
    }
  },

  async confirmarRecibido(idPedido) {
    if (!confirm("¿Confirmas que recibiste el pedido?")) return;
    try {
      await db.collection("pedidos").doc(idPedido).update({ estado: "entregado" });
      await db.collection("notificaciones_admin").add({
        tipo: "entrega",
        mensaje: `El cliente confirmó la entrega del pedido con ID: ${idPedido}`,
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        visto: false,
      });
      alert("¡Gracias por confirmar! Pedido marcado como entregado.");
      Pedidos.cargarPedidos();
    } catch (error) {
      console.error("Error al confirmar recibido:", error);
      alert("Error al confirmar recibido.");
    }
  },

  async ocultarPedido(idPedido) {
    if (!confirm("¿Confirmas que recibiste el pedido correctamente y quieres ocultarlo de tu lista?")) return;
    try {
      await db.collection("pedidos").doc(idPedido).update({ ocultoCliente: true });
      alert("Recibí conforme. El pedido fue ocultado de tu lista.");
      Pedidos.cargarPedidos();
    } catch (error) {
      console.error("Error al ocultar el pedido:", error);
      alert("Error al ocultar el pedido.");
    }
  },

  // Chat de pedido (con repartidor)
  escucharChat(idPedido) {
    const mensajesDiv = document.getElementById("mensajesChat_" + idPedido);
    if (!mensajesDiv) return;
    db.collection("pedidos")
      .doc(idPedido)
      .collection("chat")
      .orderBy("timestamp")
      .onSnapshot((snapshot) => {
        mensajesDiv.innerHTML = "";
        snapshot.forEach((doc) => {
          const m = doc.data();
          const claseMensaje = m.uidEmisor === currentUser.uid ? "text-right" : "text-left";
          mensajesDiv.innerHTML += `<div class="${claseMensaje} mb-1"><b>${m.nombreEmisor}:</b> ${Utils.escapeHtml(m.texto)}</div>`;
        });
        mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
      });
  },
  enviarMensajeChat(idPedido) {
    const input = document.getElementById("inputChat_" + idPedido);
    const texto = input.value.trim();
    if (!texto) return;
    db.collection("pedidos")
      .doc(idPedido)
      .collection("chat")
      .add({
        texto,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        uidEmisor: currentUser.uid,
        nombreEmisor: currentUser.displayName || "Cliente",
      });
    input.value = "";
  }
};

// ------------------ CHAT ADMINISTRADOR ------------------
const ChatAdmin = {
  abrirChatAdmin() {
    document.getElementById("chatAdminBox").classList.remove("hidden");
    document.getElementById("chatAdminBtn").classList.add("hidden");
    ChatAdmin.marcarMensajesLeidosAdmin();
    setTimeout(() => {
      document.getElementById("inputChatAdmin").focus();
    }, 200);
  },
  cerrarChatAdmin() {
    document.getElementById("chatAdminBox").classList.add("hidden");
    document.getElementById("chatAdminBtn").classList.remove("hidden");
  },
  chatAdminUnsub: null,
  ultimoTimestampLeido: null,
  ultimoMsPrevio: 0,
  escucharChatAdmin() {
    if (!currentUser) return;
    if (ChatAdmin.chatAdminUnsub) ChatAdmin.chatAdminUnsub();
    const mensajesDiv = document.getElementById("mensajesChatAdmin");
    const chatBtn = document.getElementById("chatAdminBtn");
    const chatAlertAudio = document.getElementById("chatAlertAudio");

    ChatAdmin.ultimoTimestampLeido = Number(localStorage.getItem("chatAdminUltLeido") || 0);
    ChatAdmin.ultimoMsPrevio = Number(localStorage.getItem("chatAdminUltMs") || 0);

    ChatAdmin.chatAdminUnsub = db.collection("chats_clientes")
      .doc(currentUser.uid)
      .collection("mensajes")
      .orderBy("timestamp")
      .onSnapshot(snapshot => {
        mensajesDiv.innerHTML = "";
        let hayNoLeido = false;
        let ultimoMs = 0;
        let mensajeNuevo = false;

        snapshot.forEach(doc => {
          const m = doc.data();
          const clase = m.uidEmisor === currentUser.uid ? "text-right" : "text-left";
          mensajesDiv.innerHTML += `<div class="${clase} mb-1"><b>${Utils.escapeHtml(m.nombreEmisor)}:</b> ${Utils.escapeHtml(m.texto)}</div>`;
          if (m.uidEmisor !== currentUser.uid && m.timestamp && m.timestamp.toMillis) {
            const ms = m.timestamp.toMillis();
            if (ms > ChatAdmin.ultimoTimestampLeido) hayNoLeido = true;
            if (ms > ultimoMs) ultimoMs = ms;
            if (ms > ChatAdmin.ultimoMsPrevio) mensajeNuevo = true;
          }
        });
        mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
        if (hayNoLeido) {
          chatBtn.classList.add("noti");
          if (mensajeNuevo && document.getElementById("chatAdminBox").classList.contains("hidden")) {
            try { chatAlertAudio.play(); } catch (e) { }
          }
        } else {
          chatBtn.classList.remove("noti");
        }
        if (ultimoMs > 0) {
          localStorage.setItem("chatAdminUltMs", ultimoMs);
          ChatAdmin.ultimoMsPrevio = ultimoMs;
        }
      });
  },
  marcarMensajesLeidosAdmin() {
    const ultimoMs = Number(localStorage.getItem("chatAdminUltMs") || 0);
    if (ultimoMs > 0) {
      localStorage.setItem("chatAdminUltLeido", ultimoMs);
      document.getElementById("chatAdminBtn").classList.remove("noti");
    }
  },
  enviarMensajeChatAdmin() {
  const input = document.getElementById("inputChatAdmin");
  const texto = input.value.trim();
  if (!texto || !currentUser) return;

  db.collection("chats_clientes")
    .doc(currentUser.uid)
    .collection("mensajes")
    .add({
      texto,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      uidEmisor: currentUser.uid,
      nombreEmisor: (currentUser.displayName || "Cliente"),
      leidoPorAdmin: false
    });

  input.value = "";
  setTimeout(ChatAdmin.marcarMensajesLeidosAdmin, 400);
}
};

// ------------------ AUTENTICACIÓN Y ARRANQUE ------------------
firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "../login.html";
    return;
  }
  try {
    const doc = await db.collection("usuarios").doc(user.uid).get();
    if (!doc.exists || doc.data().tipo !== "cliente") {
      alert("Acceso no autorizado");
      firebase.auth().signOut();
      window.location.href = "../index.html";
      return;
    }
    currentUser = user;
    UI.mostrarDatos(doc.data());
    Pedidos.cargarPedidos();
    iniciarUbicacionTiempoRealCliente();
    setTimeout(ChatAdmin.escucharChatAdmin, 1000);
  } catch (error) {
    console.error("Error al cargar datos del cliente:", error);
    alert("Error al cargar datos. Intenta nuevamente.");
  }
});

function logout() {
  firebase.auth().signOut().then(() => (window.location.href = "../index.html"));
}

// ------------------ UBICACIÓN EN TIEMPO REAL ------------------
function iniciarUbicacionTiempoRealCliente() {
  if (navigator.geolocation) {
    watchIdCliente = navigator.geolocation.watchPosition(
      function (position) {
        if (!currentUser) return;
        db.collection("usuarios").doc(currentUser.uid).update({
          ubicacionTiempoReal: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            actualizado: firebase.firestore.FieldValue.serverTimestamp()
          }
        }).catch((error) => {
          console.warn("Error actualizando ubicación en tiempo real:", error);
        });
      },
      function (error) {
        console.warn("Error obteniendo ubicación en tiempo real:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    console.warn("Geolocalización no soportada en este navegador.");
  }
}


