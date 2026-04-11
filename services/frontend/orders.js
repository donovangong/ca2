const ORDER_API = "/api";

async function loadOrders() {
  const ordersDiv = document.getElementById("orders");

  try {
    const response = await fetch(`${ORDER_API}/orders`);
    const orders = await response.json();

    ordersDiv.innerHTML = "";

    if (!orders.length) {
      ordersDiv.innerHTML = "<p>No orders yet.</p>";
      return;
    }

    orders.forEach((order) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <p>ID: ${order.id}</p>
        <p>Product ID: ${order.product_id}</p>
        <p>Quantity: ${order.quantity}</p>
        <p>Total Price: ${order.total_price}</p>
        <p>Created At: ${new Date(order.created_at).toLocaleString()}</p>
      `;
      ordersDiv.appendChild(card);
    });
  } catch (error) {
    ordersDiv.innerHTML = "<p>Could not load orders.</p>";
  }
}

loadOrders();
