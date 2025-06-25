// Listar repartidores
async function cargarRepartidores() {
  const contenedor = document.getElementById("repartidores");
  contenedor.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-700">Repartidores registrados</h2>
      <button onclick="abrirModalRepartidor()" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">+ Nuevo Repartidor</button>
    </div>
    <div id="tablaRepartidores"></div>
  `;

  const tabla = document.getElementById("tablaRepartidores");
  tabla.innerHTML = `<p class="text-gray-500">Cargando repartidores...</p>`;

  try {
    const querySnapshot = await db.collection("usuarios").where("tipo", "==", "repartidor").get();
    if (querySnapshot.empty) {
      tabla.innerHTML = `<p class="text-gray-500">No hay repartidores registrados.</p>`;
      return;
    }

    const repartidores = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    repartidores.sort((a,b) => (a.aprobado === b.aprobado) ? 0 : a.aprobado ? 1 : -1);

    tabla.innerHTML = repartidores.map(d => {
      const estado = d.bloqueado ? "Bloqueado" : (d.aprobado ? "Aprobado" : "Pendiente");
      const bloqueoBtnClass = d.bloqueado
        ? 'bg-blue-500 hover:bg-blue-600'
        : 'bg-red-500 hover:bg-red-600';
      const bloqueoBtnText = d.bloqueado ? 'Desbloquear' : 'Bloquear';
      return `
        <div class="bg-white rounded shadow p-4 mb-4">
          <h3 class="text-lg font-semibold text-gray-700">${d.nombre} ${d.apellido}</h3>
          <p class="text-gray-600">${d.email}</p>
          <p class="text-gray-600">${d.telefono || "-"}</p>
          <p class="text-gray-600">Estado: ${estado}</p>
          <div class="mt-2 space-y-2">
            ${!d.aprobado ? `<button onclick="aprobarRepartidor('${d.id}')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm w-full">Aprobar</button>` : ""}
            <button onclick="toggleBloqueoRepartidor('${d.id}', ${!!d.bloqueado})" class="${bloqueoBtnClass} text-white px-2 py-1 rounded text-sm w-full">
              ${bloqueoBtnText}
            </button>
            <button onclick="abrirEditarRepartidor('${d.id}')" class="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-sm w-full">Editar</button>
            <button onclick="abrirModalConfirmacion('${d.id}', 'repartidor', '${d.nombre} ${d.apellido}')" class="bg-red-700 hover:bg-red-800 text-white px-2 py-1 rounded text-sm w-full">Eliminar</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    mostrarAlerta("Error al cargar repartidores", "error");
    mostrarErrorSistema("Error al cargar repartidores: " + (error.message || error));
    console.error(error);
  }
}

// Aprobar repartidor
async function aprobarRepartidor(uid) {
  try {
    await db.collection("usuarios").doc(uid).update({ aprobado: true });
    mostrarAlerta("Repartidor aprobado.", "success");
    cargarRepartidores();
  } catch (error) {
    mostrarAlerta("Error al aprobar repartidor", "error");
    mostrarErrorSistema("Error al aprobar repartidor: " + (error.message || error));
    console.error(error);
  }
}

// Bloquear/desbloquear repartidor
async function toggleBloqueoRepartidor(uid, actual) {
  try {
    await db.collection("usuarios").doc(uid).update({ bloqueado: !actual });
    mostrarAlerta(actual ? "Repartidor desbloqueado." : "Repartidor bloqueado.", "success");
    cargarRepartidores();
  } catch (error) {
    mostrarAlerta("Error al cambiar estado de bloqueo", "error");
    mostrarErrorSistema("Error al cambiar estado de bloqueo: " + (error.message || error));
    console.error(error);
  }
}

// Abrir modal para nuevo repartidor
function abrirModalRepartidor() {
  document.getElementById("tituloModalRepartidor").textContent = "Nuevo Repartidor";
  document.getElementById("formRepartidor").reset();
  document.getElementById("repartidorId").value = "";
  abrirModal("modalRepartidor");
}

// Guardar repartidor (nuevo o editar)
document.getElementById("formRepartidor").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("repartidorId").value;
  const nombre = document.getElementById("nombreRepartidor").value.trim();
  const apellido = document.getElementById("apellidoRepartidor").value.trim();
  const email = document.getElementById("emailRepartidor").value.trim();
  const telefono = document.getElementById("telefonoRepartidor").value.trim();

  if (!nombre || !apellido || !email) {
    mostrarAlerta("Por favor completa los campos obligatorios.", "error");
    return;
  }

  try {
    if (id) {
      await db.collection("usuarios").doc(id).update({ nombre, apellido, email, telefono });
      mostrarAlerta("Repartidor actualizado correctamente.", "success");
    } else {
      await db.collection("usuarios").add({
        nombre,
        apellido,
        email,
        telefono,
        tipo: "repartidor",
        aprobado: false,
        bloqueado: false,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      });
      mostrarAlerta("Repartidor creado correctamente.", "success");
    }
    cerrarModal("modalRepartidor");
    cargarRepartidores();
  } catch (error) {
    mostrarAlerta("Error al guardar repartidor.", "error");
    mostrarErrorSistema("Error al guardar repartidor: " + (error.message || error));
    console.error(error);
  }
});

// Abrir modal para editar repartidor
async function abrirEditarRepartidor(id) {
  try {
    const doc = await db.collection("usuarios").doc(id).get();
    if (!doc.exists) {
      mostrarAlerta("Repartidor no encontrado", "error");
      return;
    }
    const d = doc.data();
    document.getElementById("tituloModalRepartidor").textContent = "Editar Repartidor";
    document.getElementById("repartidorId").value = id;
    document.getElementById("nombreRepartidor").value = d.nombre || "";
    document.getElementById("apellidoRepartidor").value = d.apellido || "";
    document.getElementById("emailRepartidor").value = d.email || "";
    document.getElementById("telefonoRepartidor").value = d.telefono || "";
    abrirModal("modalRepartidor");
  } catch (error) {
    mostrarAlerta("Error al cargar repartidor", "error");
    mostrarErrorSistema("Error al cargar repartidor: " + (error.message || error));
    console.error(error);
  }
}
