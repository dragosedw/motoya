// Listar pedidos
async function cargarPedidos() {
  const grid = document.getElementById("contenedorPedidos");
  if (!grid) return;
  grid.innerHTML = `<p class="text-gray-500">Cargando pedidos...</p>`;

  try {
    // Repartidores aprobados y activos
    const repartidoresSnap = await db.collection("usuarios")
      .where("tipo", "==", "repartidor")
      .where("bloqueado", "==", false)
      .where("aprobado", "==", true)
      .get();
    const repartidores = repartidoresSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Pedidos
    const pedidosSnap = await db.collection("pedidos").orderBy("fecha", "desc").get();

    // Filtrar los pedidos que NO estén ocultos
    const pedidosVisibles = pedidosSnap.docs.filter(doc => !doc.data().oculto);

    if (pedidosVisibles.length === 0) {
      grid.innerHTML = `<p class="text-gray-500">No hay pedidos.</p>`;
      return;
    }

    grid.innerHTML = pedidosVisibles.map(doc => {
      const p = doc.data();
      const estado = p.estado || "pendiente";
      const estadoColor =
        estado === "completado" ? "text-green-600" :
        estado === "asignado" ? "text-blue-600" :
        estado === "pendiente" ? "text-yellow-500" : "text-gray-600";
      const nombreCliente = p.nombreCliente || "N/A";
      const direccion = p.direccion || "N/A";
      const fechaStr = p.fecha?.toDate().toLocaleString() || "Sin fecha";

      let botonesAdicionales = "";
      if (estado === "pendiente") {
        botonesAdicionales = `
          <button onclick="abrirModalAsignarPedido('${doc.id}')" class="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded font-semibold w-full sm:w-auto">Asignar</button>
        `;
      } else if (estado === "asignado") {
        botonesAdicionales = `
          <button onclick="marcarComoEntregado('${doc.id}')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded font-semibold w-full sm:w-auto">Completar</button>
        `;
      }

      // BOTÓN OCULTAR
      const botonOcultar = `
        <button onclick="ocultarPedido('${doc.id}')" class="bg-gray-400 hover:bg-gray-600 text-white px-4 py-1 rounded font-semibold w-full sm:w-auto">Ocultar</button>
      `;

      return `
        <div class="bg-white rounded shadow p-4 flex flex-col">
          <div class="flex-grow">
            <h3 class="text-lg font-semibold text-gray-800 mb-1">Cliente: ${nombreCliente}</h3>
            <p class="text-gray-600 mb-1">Dirección: ${direccion}</p>
            <p class="text-gray-600 mb-1">Fecha: ${fechaStr}</p>
            <p class="mb-2 ${estadoColor} font-semibold capitalize">Estado: ${estado}</p>
          </div>
          <div class="flex flex-col gap-2 mt-2">
            <div class="flex flex-col sm:flex-row gap-2">
              ${botonesAdicionales}
              <button onclick="abrirDetallePedido('${doc.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded font-semibold w-full sm:w-auto">Ver detalles</button>
              ${botonOcultar}
            </div>
            ${(estado !== "pendiente") ? `
              <div class="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2">
                <span class="text-gray-700 font-medium whitespace-nowrap">Costo: <span class="text-green-700">$${p.total?.toFixed(2) || "0.00"}</span></span>
                <span class="text-gray-700 font-medium whitespace-nowrap">Comisión: <span class="text-red-700">$${p.comision?.toFixed(2) || "0.00"}</span></span>
              </div>
            ` : ""}
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    mostrarAlerta("Error al cargar pedidos", "error");
    if (typeof mostrarErrorSistema === "function") {
      mostrarErrorSistema("Error al cargar pedidos: " + (error.message || error));
    }
    console.error(error);
  }
}

// Asignar pedido a repartidor
async function asignarPedido(pedidoId) {
  const select = document.getElementById(`repartidor-${pedidoId}`);
  const repartidorId = select.value;

  if (!repartidorId) {
    mostrarAlerta("Selecciona un repartidor", "error");
    return;
  }

  try {
    const repartidorDoc = await db.collection("usuarios").doc(repartidorId).get();
    if (!repartidorDoc.exists) {
      mostrarAlerta("Repartidor no encontrado", "error");
      return;
    }

    const repartidor = repartidorDoc.data();

    await db.collection("pedidos").doc(pedidoId).update({
      uidRepartidor: repartidorId,
      nombreRepartidor: `${repartidor.nombre} ${repartidor.apellido}`,
      telefonoRepartidor: repartidor.telefono || "",
      estado: "asignado",
      asignadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });

    mostrarAlerta("Pedido asignado correctamente.", "success");
    cargarPedidos();
    cargarDatosDashboard();
  } catch (error) {
    mostrarAlerta("Ocurrió un error al asignar el pedido.", "error");
    mostrarErrorSistema("Error al asignar pedido: " + (error.message || error));
    console.error(error);
  }
}

// Marcar pedido como entregado (antes "completado")
async function marcarComoEntregado(pedidoId) {
  try {
    await db.collection("pedidos").doc(pedidoId).update({
      estado: "entregado",
      entregadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
    mostrarAlerta("Pedido marcado como entregado.", "success");
    cargarPedidos();
    cargarDatosDashboard();
  } catch (error) {
    mostrarAlerta("Error al marcar como entregado.", "error");
    mostrarErrorSistema("Error al marcar como entregado: " + (error.message || error));
    console.error(error);
  }
}


// Ver detalles de pedido (abre modal)
async function abrirDetallePedido(pedidoId) {
  const modal = document.getElementById("modalDetallePedido");
  const contenido = document.getElementById("contenidoDetallePedido");
  contenido.innerHTML = `<p class="text-gray-500">Cargando detalles...</p>`;
  abrirModal("modalDetallePedido");

  try {
    const doc = await db.collection("pedidos").doc(pedidoId).get();
    if (!doc.exists) {
      contenido.innerHTML = `<p class="text-red-600">Pedido no encontrado.</p>`;
      return;
    }

    const p = doc.data();
    const fechaStr = p.fecha?.toDate().toLocaleString() || "Sin fecha";

    contenido.innerHTML = `
      <p><strong>Cliente:</strong> ${p.nombreCliente || "N/A"}</p>
      <p><strong>Teléfono Cliente:</strong> ${p.telefonoCliente || "N/A"}</p>
      <p><strong>Dirección:</strong> ${p.direccion || "N/A"}</p>
      <p><strong>Estado:</strong> <span class="capitalize font-semibold">${p.estado || "pendiente"}</span></p>
      <p><strong>Fecha:</strong> ${fechaStr}</p>
      <p><strong>Total:</strong> $${p.total ? p.total.toLocaleString() : "0"}</p>
      <hr class="my-3" />
      <h4 class="font-semibold">Descripción del pedido:</h4>
      <p>${p.descripcion || "No hay descripción disponible."}</p>
      <hr class="my-3" />
      <p><strong>Repartidor asignado:</strong> ${p.nombreRepartidor || "No asignado"}</p>
      <p><strong>Teléfono Repartidor:</strong> ${p.telefonoRepartidor || "N/A"}</p>
    `;
  } catch (error) {
    contenido.innerHTML = `<p class="text-red-600">Error al cargar detalles.</p>`;
    mostrarErrorSistema("Error al cargar detalles del pedido: " + (error.message || error));
    console.error(error);
  }
}

async function ocultarPedido(pedidoId) {
  if (!confirm("¿Seguro que deseas ocultar este pedido?")) return;
  try {
    await db.collection("pedidos").doc(pedidoId).update({
      oculto: true
    });
    mostrarAlerta("Pedido ocultado correctamente.", "success");
    cargarPedidos();
  } catch (error) {
    mostrarAlerta("Error al ocultar pedido.", "error");
    console.error(error);
  }
}


// Abrir el modal de asignar pedido
async function abrirModalAsignarPedido(pedidoId) {
  document.getElementById('asignarPedidoId').value = pedidoId;

  // Cargar repartidores activos y aprobados para el select
  const select = document.getElementById('asignarRepartidor');
  select.innerHTML = `<option value="">Cargando repartidores...</option>`;
  try {
    const repartidoresSnap = await db.collection("usuarios")
      .where("tipo", "==", "repartidor")
      .where("bloqueado", "==", false)
      .where("aprobado", "==", true)
      .get();
    select.innerHTML = repartidoresSnap.docs.map(doc => {
      const d = doc.data();
      return `<option value="${doc.id}">${d.nombre} ${d.apellido}</option>`;
    }).join('');
  } catch (error) {
    select.innerHTML = `<option value="">Error cargando repartidores</option>`;
  }
  document.getElementById('formAsignarPedido').reset();
  abrirModal('modalAsignarPedido');
}

// Evento submit del formulario de asignar pedido
document.getElementById('formAsignarPedido').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pedidoId = document.getElementById('asignarPedidoId').value;
  const total = parseFloat(document.getElementById('asignarTotal').value);
  const comision = parseFloat(document.getElementById('asignarComision').value);
  const repartidorId = document.getElementById('asignarRepartidor').value;

  if (!pedidoId || !repartidorId || isNaN(total) || isNaN(comision)) {
    mostrarAlerta("Completa todos los campos.", "error");
    return;
  }

  try {
    const repartidorDoc = await db.collection("usuarios").doc(repartidorId).get();
    const repartidor = repartidorDoc.data();

    await db.collection("pedidos").doc(pedidoId).update({
      uidRepartidor: repartidorId,
      nombreRepartidor: `${repartidor.nombre} ${repartidor.apellido}`,
      telefonoRepartidor: repartidor.telefono || "",
      total,
      comision,
      comisionPagada: false,
      estado: "asignado",
      asignadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });

    mostrarAlerta("Pedido asignado correctamente.", "success");
    cerrarModal('modalAsignarPedido');
    cargarPedidos();
    cargarDatosDashboard()
  } catch (error) {
    mostrarAlerta("Error al asignar pedido.", "error");
    console.error(error);
  }
});
 // notificaciones sonido
let pedidosInicializados = false;
let estadosAnteriores = {}; // Para detectar cambios de estado

const sonido = new Audio('notificacion.mp3'); // Asegúrate de tener este archivo

db.collection("pedidos")
  .orderBy("fecha", "desc")
  .onSnapshot((snapshot) => {
    if (!pedidosInicializados) {
      // Primera vez: guardamos estados sin notificar
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        estadosAnteriores[doc.id] = data.estado;
      });
      pedidosInicializados = true;
      return;
    }

    snapshot.docChanges().forEach(change => {
      const pedido = change.doc.data();
      const id = change.doc.id;
      const nuevoEstado = pedido.estado || "pendiente";
      const estadoPrevio = estadosAnteriores[id];
      const nombreCliente = pedido.nombreCliente || "Nuevo Cliente";

      // NUEVO PEDIDO
      if (change.type === "added" && !pedido.oculto) {
        sonido.play();
        document.title = `🛒 Nuevo pedido de ${nombreCliente}`;
        setTimeout(() => document.title = "Admin - Pedidos", 3000);
        mostrarAlerta("🛒 ¡Nuevo pedido recibido!", "info");
        cargarPedidos(); // Refresca vista si estás viéndola
      }

      // CAMBIO DE ESTADO
      if (change.type === "modified" && estadoPrevio !== nuevoEstado) {
        sonido.play();
        document.title = `📦 Pedido actualizado: ${nuevoEstado}`;
        setTimeout(() => document.title = "Admin - Pedidos", 3000);
        mostrarAlerta(`📦 Pedido cambiado a "${nuevoEstado}"`, "info");
        cargarPedidos(); // Refresca vista
      }

      // Actualizamos estado guardado
      estadosAnteriores[id] = nuevoEstado;
    });
  });
