const ORDER_API = "/api";

async function loadOrders() {
  const ordersDiv = document.getElementById("orders");

  try {
    const orders = await fetchJson(`${ORDER_API}/orders`);

    ordersDiv.innerHTML = "";

    if (!orders.length) {
      ordersDiv.innerHTML = "<p>No orders yet.</p>";
      return;
    }

    renderCards(ordersDiv, orders, (order) => `
        <p>ID: ${order.id}</p>
        <p>Product ID: ${order.product_id}</p>
        <p>Quantity: ${order.quantity}</p>
        <p>Total Price: ${order.total_price}</p>
        <p>Created At: ${new Date(order.created_at).toLocaleString()}</p>
      `);
  } catch (error) {
    ordersDiv.innerHTML = "<p>Could not load orders.</p>";
  }
}

loadOrders();
