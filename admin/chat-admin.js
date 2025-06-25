// ===================== CHAT ADMINISTRADOR (INTEGRADO CON REPARTIDORES Y CLIENTES) =====================
 adminUid = null;

window.usuarioSeleccionado = null;

window.usnsubscribeChat = null;

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

  // Elegir colección según tipo de usuario:
  let chatCollection;
  if (usuarioSeleccionado.tipo === "repartidor") {
    chatCollection = db.collection("chats_admin").doc(uidUsuario).collection("mensajes");
  } else {
    chatCollection = db.collection("chats_clientes").doc(uidUsuario).collection("mensajes");
  }

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
      });
      mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
    });

  // ✅ Habilitar input y botón aquí
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
