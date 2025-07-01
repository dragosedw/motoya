// src/pedidos/activos.js

import { db } from "../modules/init.js";

export function generarBotonEntregar(idPedido) {
  return `
    <button class="btn-entregar" data-id="${idPedido}">Marcar como entregado</button>
  `;
}

export function escucharBotonesEntregar() {
  document.querySelectorAll(".btn-entregar").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      try {
        await db.collection("pedidos").doc(id).update({ estado: "entregado" });
        btn.disabled = true;
        btn.innerText = "Entregado";
      } catch (err) {
        console.error("Error al marcar entregado:", err);
      }
    });
  });
}
