// ===================== CHAT ADMINISTRADOR (INTEGRADO CON REPARTIDORES Y CLIENTES) =====================
 adminUid = null;
 
window.usuarioSeleccionado = null;

 unsubscribeChat = null;

// Cargar usuarios cuando se abre la pestaña de chat
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab-button").forEach(button => {
    button.addEventListener("click", () => {
      const tab = button.getAttribute("data-tab");
      if (tab === "chatAdmin") {
        cargarUsuariosChatAdmin();
      }
    });
  });
});

// Cargar repartidores y clientes para el chat
async function cargarUsuariosChatAdmin() {
  const usuariosList = document.getElementById("listaUsuarios");
  usuariosList.innerHTML = "<li>Cargando usuarios...</li>";

  try {
    const snapshot = await db.collection("usuarios")
      .where("tipo", "in", ["repartidor", "cliente"])
      .get();

    if (snapshot.empty) {
      usuariosList.innerHTML = "<li>No hay usuarios disponibles.</li>";
      return;
    }

    // Ordenar: primero repartidores, luego clientes
    const usuarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    usuarios.sort((a, b) => {
      if (a.tipo === b.tipo) return 0;
      return a.tipo === "repartidor" ? -1 : 1;
    });

    usuariosList.innerHTML = "";
    usuarios.forEach(user => {
      const li = document.createElement("li");
      li.className = "py-2 px-2 cursor-pointer hover:bg-gray-100";
      const nombre = `${user.nombre || ""} ${user.apellido || ""}`.trim() || user.id;
      const tipo = user.tipo === "repartidor" ? "🛵 Repartidor" : "👤 Cliente";
      li.innerHTML = `<span class="font-semibold">${nombre}</span> <span class="ml-2 text-xs text-gray-500">${tipo}</span>`;
      li.onclick = () => abrirChatAdmin(user.id, user);
      usuariosList.appendChild(li);
    });
  } catch (error) {
    usuariosList.innerHTML = `<li>Error cargando usuarios: ${error.message}</li>`;
    console.error(error);
  }
}

// Abrir chat con usuario seleccionado (repartidor o cliente)
function abrirChatAdmin(uidUsuario, userData) {
  usuarioSeleccionado = {
    uid: uidUsuario,
    nombre: `${userData.nombre || ""} ${userData.apellido || ""}`.trim() || uidUsuario,
    tipo: userData.tipo
  };

  document.getElementById("chatTitulo").textContent =
    `Chat con ${usuarioSeleccionado.nombre} (${usuarioSeleccionado.tipo === "repartidor" ? "Repartidor" : "Cliente"})`;

  const mensajesDiv = document.getElementById("mensajesChat");
  mensajesDiv.innerHTML = "Cargando mensajes...";

  if (unsubscribeChat) unsubscribeChat();

  let chatCollection;
  if (usuarioSeleccionado.tipo === "repartidor") {
    chatCollection = db.collection("chats_admin").doc(uidUsuario).collection("mensajes");
  } else {
    chatCollection = db.collection("chats_clientes").doc(uidUsuario).collection("mensajes");
  }

  let ultimoTimestamp = null;

  unsubscribeChat = chatCollection
    .orderBy("timestamp")
    .onSnapshot(snapshot => {
      mensajesDiv.innerHTML = "";
      snapshot.forEach(doc => {
        const msg = doc.data();
        const div = document.createElement("div");
        div.className = msg.uidEmisor === adminUid ? "text-right mb-1" : "text-left mb-1";
        div.innerHTML = `<b>${escapeHtml(msg.nombreEmisor)}:</b> ${escapeHtml(msg.texto)}`;
        mensajesDiv.appendChild(div);

        // 🟡 Notificar si es un nuevo mensaje de otro usuario
        if (
          msg.uidEmisor !== adminUid &&
          (!ultimoTimestamp || msg.timestamp?.seconds > ultimoTimestamp)
        ) {
          reproducirSonidoNotificacion();
          cambiarTituloTemporal(`💬 Nuevo mensaje de ${msg.nombreEmisor}`);
          mostrarNotificacionVisual(msg.texto, msg.nombreEmisor);
        }

        if (msg.timestamp?.seconds) {
          ultimoTimestamp = msg.timestamp.seconds;
        }
      });

      mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
    });

  // ✅ Habilitar input y botón
  document.getElementById("inputMensaje").disabled = false;
  document.querySelector("#formChat button[type='submit']").disabled = false;
}

// Enviar mensaje en el chat admin
async function enviarMensaje(event) {
  event.preventDefault();
  const input = document.getElementById("inputMensaje");
  const texto = input.value.trim();
  if (!texto || !usuarioSeleccionado) return;

  try {
    let chatCollection;
    if (usuarioSeleccionado.tipo === "repartidor") {
      chatCollection = db.collection("chats_admin").doc(usuarioSeleccionado.uid).collection("mensajes");
    } else {
      chatCollection = db.collection("chats_clientes").doc(usuarioSeleccionado.uid).collection("mensajes");
    }
    await chatCollection.add({
      texto,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      uidEmisor: adminUid,
      nombreEmisor: "Administrador"
    });
    input.value = "";
  } catch (error) {
    alert("Error enviando mensaje: " + error.message);
    console.error(error);
  }
}

// Escapar texto para evitar inyección HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// 🔊 Reproducir sonido de notificación
function reproducirSonidoNotificacion() {
  const sonido = document.getElementById("notificacionSonido");
  if (sonido) {
    sonido.play().catch(err => console.warn("No se pudo reproducir el sonido:", err));
  }
}

// 🧠 Cambiar título temporalmente
 tituloOriginal = document.title;
 tituloInterval = null;

function cambiarTituloTemporal(nuevoTitulo) {
  if (document.hasFocus()) return; // No molestar si la pestaña está activa

  clearInterval(tituloInterval);
  let visible = true;
  tituloInterval = setInterval(() => {
    document.title = visible ? nuevoTitulo : tituloOriginal;
    visible = !visible;
  }, 1000);

  // Restaurar cuando vuelva el foco
  window.addEventListener("focus", () => {
    clearInterval(tituloInterval);
    document.title = tituloOriginal;
  }, { once: true });
}

function mostrarNotificacionVisual(mensaje, nombre) {
  const contenedor = document.getElementById("notificacionVisual");

  const div = document.createElement("div");
  div.className = "bg-blue-600 text-white px-4 py-3 rounded shadow mb-2 animate-fade";
  div.style.minWidth = "200px";
  div.innerHTML = `<strong>${escapeHtml(nombre)}</strong><br>${escapeHtml(mensaje)}`;

  contenedor.appendChild(div);

  setTimeout(() => {
    div.classList.add("fade-out");
    setTimeout(() => div.remove(), 500);
  }, 5000); // Se oculta después de 5 segundos
}
