// Listar clientes
async function cargarClientes() {
  const contenedor = document.getElementById("clientes");
  contenedor.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-700">Clientes registrados</h2>
      <button onclick="abrirModalCliente()" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">+ Nuevo Cliente</button>
    </div>
    <div id="contenedorClientes" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"></div>
  `;

  const grid = document.getElementById("contenedorClientes");
  grid.innerHTML = `<p class="text-gray-500">Cargando clientes...</p>`;

  try {
    const snapshot = await db.collection("usuarios").where("tipo", "==", "cliente").get();
    if (snapshot.empty) {
      grid.innerHTML = `<p class="col-span-full p-4 text-center text-gray-500">No hay clientes registrados.</p>`;
      return;
    }
    grid.innerHTML = snapshot.docs.map(doc => {
      const d = doc.data();
      return `
        <div class="bg-white rounded shadow p-4 flex flex-col justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-800">${d.nombre} ${d.apellido}</h3>
            <p class="text-gray-600">${d.email}</p>
            <p class="text-gray-600">${d.telefono || "-"}</p>
          </div>
          <div class="mt-4 flex space-x-2 flex-wrap">
            <!-- Si tienes la función abrirModalPedidosCliente, descomenta la siguiente línea -->
            <!-- <button onclick="abrirModalPedidosCliente('${doc.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex-1">Ver pedidos</button> -->
            <button onclick="abrirEditarCliente('${doc.id}')" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex-1">Editar</button>
            <button onclick="abrirModalConfirmacion('${doc.id}', 'cliente', '${d.nombre} ${d.apellido}')" class="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm flex-1">Eliminar</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    mostrarAlerta("Error al cargar clientes", "error");
    mostrarErrorSistema("Error al cargar clientes: " + (error.message || error));
    console.error(error);
  }
}

// Abrir modal para nuevo cliente
function abrirModalCliente() {
  document.getElementById("tituloModalCliente").textContent = "Nuevo Cliente";
  document.getElementById("formCliente").reset();
  document.getElementById("clienteId").value = "";
  abrirModal("modalCliente");
}

// Guardar cliente (nuevo o editar)
document.getElementById("formCliente").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("clienteId").value;
  const nombre = document.getElementById("nombreCliente").value.trim();
  const apellido = document.getElementById("apellidoCliente").value.trim();
  const email = document.getElementById("emailCliente").value.trim();
  const telefono = document.getElementById("telefonoCliente").value.trim();

  if (!nombre || !apellido || !email) {
    mostrarAlerta("Por favor completa los campos obligatorios.", "error");
    return;
  }

  try {
    if (id) {
      await db.collection("usuarios").doc(id).update({ nombre, apellido, email, telefono });
      mostrarAlerta("Cliente actualizado correctamente.", "success");
    } else {
      await db.collection("usuarios").add({
        nombre,
        apellido,
        email,
        telefono,
        tipo: "cliente",
        creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      });
      mostrarAlerta("Cliente creado correctamente.", "success");
    }
    cerrarModal("modalCliente");
    cargarClientes();
  } catch (error) {
    mostrarAlerta("Error al guardar cliente.", "error");
    mostrarErrorSistema("Error al guardar cliente: " + (error.message || error));
    console.error(error);
  }
});

// Abrir modal para editar cliente
async function abrirEditarCliente(id) {
  try {
    const doc = await db.collection("usuarios").doc(id).get();
    if (!doc.exists) {
      mostrarAlerta("Cliente no encontrado", "error");
      return;
    }
    const d = doc.data();
    document.getElementById("tituloModalCliente").textContent = "Editar Cliente";
    document.getElementById("clienteId").value = id;
    document.getElementById("nombreCliente").value = d.nombre || "";
    document.getElementById("apellidoCliente").value = d.apellido || "";
    document.getElementById("emailCliente").value = d.email || "";
    document.getElementById("telefonoCliente").value = d.telefono || "";
    abrirModal("modalCliente");
  } catch (error) {
    mostrarAlerta("Error al cargar cliente", "error");
    mostrarErrorSistema("Error al cargar cliente: " + (error.message || error));
    console.error(error);
  }
}
