// src/ui/cardPedido.js

export function crearCardPedido(pedido, accionesHtml = "") {
  return `
    <div class="pedido-card">
      <p><strong>Cliente:</strong> ${pedido.nombreCliente}</p>
      <p><strong>Dirección:</strong> ${pedido.direccionEntrega}</p>
      <p><strong>Estado:</strong> ${pedido.estado}</p>
      ${accionesHtml}
    </div>
  `;
}
