// ==================== PEDIDOS OCULTOS ====================

// Variables globales para filtros
let repartidoresGlobal = [];
let clientesGlobal = [];

// Cargar repartidores y clientes para los filtros (solo una vez)
async function cargarOpcionesFiltrosOcultos() {
  // Repartidores
  if (repartidoresGlobal.length === 0) {
    const repartidoresSnap = await db.collection("usuarios")
      .where("tipo", "==", "repartidor")
      .get();
    repartidoresGlobal = repartidoresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  const selectRepartidor = document.getElementById("filtroRepartidorOculto");
  if (selectRepartidor) {
    selectRepartidor.innerHTML = `<option value="todos">Todos los repartidores</option>` +
      repartidoresGlobal.map(r => `<option value="${r.id}">${r.nombre} ${r.apellido}</option>`).join('');
  }

  // Clientes
  if (clientesGlobal.length === 0) {
    const clientesSnap = await db.collection("usuarios")
      .where("tipo", "==", "cliente")
      .get();
    clientesGlobal = clientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  const selectCliente = document.getElementById("filtroClienteOculto");
  if (selectCliente) {
    selectCliente.innerHTML = `<option value="todos">Todos los clientes</option>` +
      clientesGlobal.map(c => `<option value="${c.id}">${c.nombre} ${c.apellido}</option>`).join('');
  }
}

// Función para cargar y filtrar pedidos ocultos
async function cargarPedidosOcultos() {
  await cargarOpcionesFiltrosOcultos();

  const estado = document.getElementById("filtroEstadoOculto").value;
  const uidRepartidor = document.getElementById("filtroRepartidorOculto").value;
  const uidCliente = document.getElementById("filtroClienteOculto").value;
  const grid = document.getElementById("contenedorPedidosOcultos");
  grid.innerHTML = `<p class="text-gray-500">Cargando pedidos ocultos...</p>`;

  try {
    const pedidosSnap = await db.collection("pedidos").orderBy("fecha", "desc").get();
    let pedidosOcultos = pedidosSnap.docs
      .filter(doc => doc.data().oculto)
      .map(doc => ({ id: doc.id, ...doc.data() }));

    // Filtros
    if (estado !== "todos") pedidosOcultos = pedidosOcultos.filter(p => p.estado === estado);
    if (uidRepartidor !== "todos") pedidosOcultos = pedidosOcultos.filter(p => p.uidRepartidor === uidRepartidor);
    if (uidCliente !== "todos") pedidosOcultos = pedidosOcultos.filter(p => p.uidCliente === uidCliente);

    if (pedidosOcultos.length === 0) {
      grid.innerHTML = `<p class="text-gray-500">No hay pedidos ocultos con estos filtros.</p>`;
      return;
    }

    grid.innerHTML = pedidosOcultos.map(p => {
      const estadoColor =
        p.estado === "completado" ? "text-green-600" :
        p.estado === "asignado" ? "text-blue-600" :
        p.estado === "pendiente" ? "text-yellow-500" : "text-gray-600";
      const fechaStr = p.fecha?.toDate().toLocaleString() || "Sin fecha";
      return `
        <div class="bg-white rounded shadow p-4 flex flex-col">
          <div class="flex-grow">
            <h3 class="text-lg font-semibold text-gray-800 mb-1">Cliente: ${p.nombreCliente || "N/A"}</h3>
            <p class="text-gray-600 mb-1">Dirección: ${p.direccion || "N/A"}</p>
            <p class="text-gray-600 mb-1">Fecha: ${fechaStr}</p>
            <p class="mb-2 ${estadoColor} font-semibold capitalize">Estado: ${p.estado || "pendiente"}</p>
          </div>
          <div class="flex flex-col gap-2 mt-2">
            <button onclick="abrirDetallePedido('${p.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded font-semibold w-full sm:w-auto">Ver detalles</button>
            <button onclick="restaurarPedido('${p.id}')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded font-semibold w-full sm:w-auto">Restaurar</button>
            <button onclick="eliminarPedidoOculto('${p.id}')" class="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded font-semibold w-full sm:w-auto">Eliminar</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    grid.innerHTML = `<p class="text-red-600">Error al cargar pedidos ocultos.</p>`;
    console.error(error);
  }
}

// Función para restaurar un pedido oculto
async function restaurarPedido(pedidoId) {
  if (!confirm("¿Deseas restaurar este pedido?")) return;
  try {
    await db.collection("pedidos").doc(pedidoId).update({ oculto: false });
    mostrarAlerta("Pedido restaurado correctamente.", "success");
    cargarPedidosOcultos();
  } catch (error) {
    mostrarAlerta("Error al restaurar el pedido.", "error");
    console.error(error);
  }
}

// Función para eliminar pedido oculto
async function eliminarPedidoOculto(pedidoId) {
  if (!confirm("¿Estás seguro de eliminar este pedido? Esta acción no se puede deshacer.")) return;
  try {
    await db.collection("pedidos").doc(pedidoId).delete();
    mostrarAlerta("Pedido eliminado correctamente.", "success");
    cargarPedidosOcultos();
  } catch (error) {
    mostrarAlerta("Error al eliminar el pedido.", "error");
    console.error(error);
  }
}

// Eventos para los filtros
document.addEventListener("DOMContentLoaded", () => {
  ["filtroEstadoOculto", "filtroRepartidorOculto", "filtroClienteOculto"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", cargarPedidosOcultos);
  });
});

