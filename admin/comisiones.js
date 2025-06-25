// Cargar resumen de comisiones por repartidor
async function cargarResumenComisiones() {
  const contenedor = document.getElementById("contenedorResumenComisiones");
  contenedor.innerHTML = `<p class="text-gray-500">Cargando resumen de comisiones...</p>`;

  try {
    // Obtener repartidores activos y aprobados
    const repartidoresSnap = await db.collection("usuarios")
      .where("tipo", "==", "repartidor")
      .where("bloqueado", "==", false)
      .where("aprobado", "==", true)
      .get();

    if (repartidoresSnap.empty) {
      contenedor.innerHTML = `<p>No hay repartidores activos.</p>`;
      return;
    }

    const repartidores = repartidoresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Para cada repartidor, calcular totales
    const resumenes = await Promise.all(repartidores.map(async (r) => {
      const pedidosSnap = await db.collection("pedidos")
        .where("uidRepartidor", "==", r.id)
        .where("estado", "==", "entregado")
        .get();

      let totalCobrado = 0;
      let totalComisionPendiente = 0;
      pedidosSnap.forEach(pedidoDoc => {
        const p = pedidoDoc.data();
        totalCobrado += p.total || 0;
        if (!p.comisionPagada) {
          totalComisionPendiente += p.comision || 0;
        }
      });

      return {
        repartidor: r,
        totalCobrado,
        totalComisionPendiente,
        pedidosPendientes: pedidosSnap.docs.filter(doc => !doc.data().comisionPagada)
      };
    }));

    contenedor.innerHTML = resumenes.map(r => `
  <div class="bg-white shadow p-4 rounded mb-4">
    <h3 class="font-bold text-lg mb-2">${r.repartidor.nombre} ${r.repartidor.apellido}</h3>
    <p>Total cobrado: <strong>$${r.totalCobrado.toFixed(2)}</strong></p>
    <p>Comisión pendiente: <strong class="text-red-600">$${r.totalComisionPendiente.toFixed(2)}</strong></p>
    ${r.totalComisionPendiente > 0 ? `
      <button onclick="marcarComisionesPagadas('${r.repartidor.id}')" class="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Marcar comisiones como pagadas</button>
      <button onclick="verDetalleComisiones('${r.repartidor.id}')" class="mt-2 ml-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Ver detalle</button>
    ` : `<p class="text-green-600 mt-2">Sin comisiones pendientes.</p>`}
  </div>
`).join('');


  } catch (error) {
    contenedor.innerHTML = `<p class="text-red-600">Error al cargar resumen de comisiones.</p>`;
    console.error(error);
  }
}

async function verDetalleComisiones(uidRepartidor) {
  const modal = document.getElementById("modalDetalleComisiones");
  const contenido = document.getElementById("contenidoDetalleComisiones");
  contenido.innerHTML = "Cargando...";
  abrirModal("modalDetalleComisiones");

  try {
    const pedidosSnap = await db.collection("pedidos")
      .where("uidRepartidor", "==", uidRepartidor)
      .where("estado", "==", "entregado")
      .where("comisionPagada", "==", false)
      .get();

    if (pedidosSnap.empty) {
      contenido.innerHTML = "<p>No hay comisiones pendientes.</p>";
      return;
    }

    contenido.innerHTML = pedidosSnap.docs.map(doc => {
      const p = doc.data();
      return `
        <div class="border-b py-2">
          <p><strong>Cliente:</strong> ${p.nombreCliente || "N/A"}</p>
          <p><strong>Fecha:</strong> ${p.fecha?.toDate().toLocaleString() || "N/A"}</p>
          <p><strong>Costo:</strong> $${p.total?.toFixed(2) || "0.00"} | <strong>Comisión:</strong> $${p.comision?.toFixed(2) || "0.00"}</p>
        </div>
      `;
    }).join('');
  } catch (error) {
    contenido.innerHTML = `<p class="text-red-600">Error al cargar detalle.</p>`;
  }
}

// Marcar comisiones como pagadas para un repartidor
async function marcarComisionesPagadas(uidRepartidor) {
  if (!confirm("¿Confirmas que las comisiones pendientes han sido pagadas a este repartidor?")) return;

  try {
    const pedidosSnap = await db.collection("pedidos")
      .where("uidRepartidor", "==", uidRepartidor)
      .where("estado", "==", "entregado")
      .where("comisionPagada", "==", false)
      .get();

    const batch = db.batch();
    pedidosSnap.forEach(doc => {
      batch.update(doc.ref, { comisionPagada: true });
    });
    await batch.commit();

    alert("Comisiones marcadas como pagadas.");
    cargarResumenComisiones();
  } catch (error) {
    alert("Error al marcar comisiones como pagadas.");
    console.error(error);
  }
}

// Mostrar errores del sistema en el dashboard
function cargarErroresSistema() {
  actualizarErroresSistema();
}
