// 🔐 Verificación de autenticación y rol administrador
auth.onAuthStateChanged(async user => {
  if (!user) {
    location.href = '../login.html';
    return;
  }

  adminUid = user.uid;

  try {
    const doc = await db.collection('usuarios').doc(user.uid).get();
    if (!doc.exists || doc.data().tipo !== 'administrador') {
      alert('Acceso no autorizado');
      await auth.signOut();
      location.href = '../login.html';
    } else {
      // ✅ Cargar comisiones antes de actualizar dashboard
      try {
        const snapshot = await db.collection('comisiones').get();
        window.comisiones = snapshot.docs.map(doc => doc.data());
      } catch (err) {
        console.warn('No se pudieron cargar comisiones:', err);
        window.comisiones = [];
      }

      cargarDatosDashboard(); // Esto primero carga y luego actualiza
      switchTab('dashboard'); // Activar pestaña por defecto
    }
  } catch (error) {
    console.error('🔥 Error al verificar usuario:', error.message, error.stack, error);
    alert(`Error al verificar usuario:\n${error.message}`);
    await auth.signOut();
    location.href = '../login.html';
  }
});

// 🔓 Logout
const logoutBtn = document.getElementById('btnLogout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => location.href = '../login.html');
  });
}

// ✅ Variables para eliminación
let eliminarId = null;
let eliminarTipo = null;

// 📦 Alertas y notificaciones iniciales
const errores = document.getElementById('erroresSistema');
if (errores) errores.innerHTML = "...";

const notificaciones = document.getElementById('listaNotificaciones');
if (notificaciones) notificaciones.innerHTML = "...";

// 📊 Actualizar Dashboard (global)
window.actualizarDashboard = function () {
  const pedidosNuevos = obtenerCantidadPedidosNuevos();
  const chatsNuevos = obtenerCantidadChatsNuevos();
  const comisionesPendientes = obtenerComisionesPendientes();

  const pedidosElem = document.getElementById("contadorPedidos");
  const mensajesElem = document.getElementById("contadorMensajes");
  const comisionesElem = document.getElementById("contadorComisiones");

  if (pedidosElem) pedidosElem.textContent = pedidosNuevos;
  if (mensajesElem) mensajesElem.textContent = chatsNuevos;
  if (comisionesElem) comisionesElem.textContent = comisionesPendientes;
};

function obtenerCantidadPedidosNuevos() {
  if (!Array.isArray(window.pedidos)) return 0;
  return window.pedidos.filter(p => p.estado === "pendiente" && !p.oculto).length;
}

function obtenerCantidadChatsNuevos() {
  return window.mensajesNoLeidos || 0;
}

function obtenerComisionesPendientes() {
  const lista = Array.isArray(window.comisiones) ? window.comisiones : [];
  return lista.filter(c => !c.pagada).length;
}

async function cargarDatosDashboard() {
  try {
    // 🔄 Cargar pedidos (solo los visibles)
    const snapshotPedidos = await db.collection('pedidos').get();
    window.pedidos = snapshotPedidos.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(p => !p.oculto); // 🔍 Solo pedidos no ocultos

    // 🔄 Cargar comisiones
    const snapshotComisiones = await db.collection('comisiones').get();
    window.comisiones = snapshotComisiones.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 🔄 Cargar mensajes no leídos por admin desde chats_clientes
let mensajesNoLeidos = 0;
const clientesSnapshot = await db.collection("usuarios")
  .where("tipo", "==", "cliente")
  .get();

for (const clienteDoc of clientesSnapshot.docs) {
  const clienteUid = clienteDoc.id;
  const mensajesSnapshot = await db.collection("chats_clientes")
    .doc(clienteUid)
    .collection("mensajes")
    .where("uidEmisor", "!=", adminUid) // Solo mensajes de clientes
    .get();
  mensajesNoLeidos += mensajesSnapshot.size;
}
window.mensajesNoLeidos = mensajesNoLeidos;


    // ✅ Finalmente actualizar el dashboard
    actualizarDashboard();

  } catch (error) {
    console.error("❌ Error al cargar datos del dashboard:", error);
  }
}

// 🗂 Manejo de pestañas
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');

const tabFunctions = {
  dashboard: actualizarDashboard,
  comisiones: cargarResumenComisiones,
  repartidores: cargarRepartidores,
  clientes: cargarClientes,
  pedidos: cargarPedidos,
  pedidosOcultos: cargarPedidosOcultos,
  chatAdmin: cargarUsuariosChatAdmin
};

function switchTab(target) {
  tabButtons.forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });

  tabPanels.forEach(panel => {
    panel.classList.remove('active');
    panel.setAttribute('aria-hidden', 'true');
  });

  const activeButton = document.querySelector(`[data-tab="${target}"]`);
  const activePanel = document.getElementById(target);

  if (activeButton && activePanel) {
    activeButton.classList.add('active');
    activeButton.setAttribute('aria-selected', 'true');
    activePanel.classList.add('active');
    activePanel.setAttribute('aria-hidden', 'false');
  }

  if (tabFunctions[target]) {
    tabFunctions[target]();
  }
}

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const target = button.dataset.tab;
    switchTab(target);
  });
});

// 🪟 Manejo de modales
window.abrirModal = function (id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
};

window.cerrarModal = function (id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
};

window.abrirModalConfirmacion = function (id, tipo, nombre) {
  eliminarId = id;
  eliminarTipo = tipo;
  const mensaje = document.getElementById('mensajeConfirmacion');
  if (mensaje) mensaje.textContent = `¿Estás seguro de eliminar al ${tipo} "${nombre}"? Esta acción no se puede deshacer.`;
  window.abrirModal('modalConfirmacion');
};

const btnCancelar = document.getElementById('btnCancelar');
if (btnCancelar) {
  btnCancelar.addEventListener('click', () => {
    window.cerrarModal('modalConfirmacion');
    eliminarId = null;
    eliminarTipo = null;
  });
}

const btnConfirmar = document.getElementById('btnConfirmar');
if (btnConfirmar) {
  btnConfirmar.addEventListener('click', async () => {
    if (!eliminarId || !eliminarTipo) return;

    try {
      await db.collection('usuarios').doc(eliminarId).delete();
      mostrarAlerta(`${eliminarTipo.charAt(0).toUpperCase() + eliminarTipo.slice(1)} eliminado correctamente.`, 'success');
      window.cerrarModal('modalConfirmacion');
      eliminarId = null;
      eliminarTipo = null;

      if (eliminarTipo === 'cliente') cargarClientes();
      else if (eliminarTipo === 'repartidor') cargarRepartidores();
    } catch (error) {
      mostrarAlerta('Error al eliminar.', 'error');
      console.error(error);
    }
  });
}

