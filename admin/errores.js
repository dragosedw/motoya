// Manejo de errores global del sistema
window.erroresSistema = [];

function mostrarErrorSistema(mensaje) {
  if (!window.erroresSistema.includes(mensaje)) {
    window.erroresSistema.push(mensaje);
    actualizarErroresSistema();
  }
}

function actualizarErroresSistema() {
  const contenedor = document.getElementById('erroresSistema');
  if (!contenedor) return;
  contenedor.innerHTML = "";
  window.erroresSistema.forEach(mensaje => {
    const alerta = document.createElement('div');
    alerta.className = "bg-red-100 border-l-4 border-red-600 p-4 rounded shadow mb-2";
    alerta.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="text-red-800 font-semibold">Error:</span>
        <button aria-label="Cerrar error" onclick="cerrarErrorSistema('${escapeHtml(mensaje)}')" class="text-red-600 font-bold text-lg ml-4">&times;</button>
      </div>
      <div class="text-red-700 mt-2">${escapeHtml(mensaje)}</div>
    `;
    contenedor.appendChild(alerta);
  });
}
// Función para mostrar alertas globales
function mostrarAlerta(mensaje, tipo = 'info', duracion = 3000) {
  const contenedor = document.getElementById('alertaGlobal');
  const div = document.createElement('div');
  div.className = `mb-2 px-4 py-2 rounded shadow text-white ${
    tipo === 'error' ? 'bg-red-600' :
    tipo === 'success' ? 'bg-green-600' : 'bg-blue-600'
  }`;
  div.textContent = mensaje;
  contenedor.appendChild(div);
  setTimeout(() => div.remove(), duracion);
}
function cerrarErrorSistema(mensaje) {
  window.erroresSistema = window.erroresSistema.filter(e => e !== mensaje);
  actualizarErroresSistema();
}
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
