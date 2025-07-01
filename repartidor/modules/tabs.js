// src/ui/tabs.js

export function configurarTabs({ onActivos, onEntregados }) {
  const btnActivos = document.getElementById("btn-activos");
  const btnEntregados = document.getElementById("btn-entregados");

  btnActivos.addEventListener("click", () => {
    onActivos();
    btnActivos.classList.add("activo");
    btnEntregados.classList.remove("activo");
  });

  btnEntregados.addEventListener("click", () => {
    onEntregados();
    btnEntregados.classList.add("activo");
    btnActivos.classList.remove("activo");
  });
}
