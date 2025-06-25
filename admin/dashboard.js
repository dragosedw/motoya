(async function () {
  // Variables para confirmar eliminación
  let eliminarId = null;
  let eliminarTipo = null;

  // Inicializar alertas y notificaciones
  const errores = document.getElementById('erroresSistema');
  if (errores) errores.innerHTML = "...";

  const notificaciones = document.getElementById('listaNotificaciones');
  if (notificaciones) notificaciones.innerHTML = "...";


  // Manejo de pestañas
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');

  const tabFunctions = {
    dashboard: window.actualizarDashboard,
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

  // ✅ Cargar datos antes de activar pestañas
  await cargarDatosDashboard(); // 👈 ¡Clave!

  switchTab('dashboard'); // Ya con datos cargados

  // Manejo de modales
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
})();

async function obtenerCantidadChatsNuevos() {
  try {
    const snapshot = await db.collection("chats_clientes").get();
    let totalNoLeidos = 0;

    for (const doc of snapshot.docs) {
      const subcoleccion = await db.collection("chats_clientes")
        .doc(doc.id)
        .collection("mensajes")
        .where("uidEmisor", "!=", adminUid) // Solo mensajes de cliente
        .where("leidoPorAdmin", "==", false)
        .get();

      totalNoLeidos += subcoleccion.size;
    }

    return totalNoLeidos;
  } catch (e) {
    console.error("Error obteniendo mensajes no leídos:", e);
    return 0;
  }
}
