const PRODUCT_API = "/api";
const ORDER_API = "/api";

async function loadProducts() {
  const productsDiv = document.getElementById("products");
  const messageDiv = document.getElementById("message");

  try {
    const response = await fetch(`${PRODUCT_API}/products`);
    const products = await response.json();

    productsDiv.innerHTML = "";
    messageDiv.textContent = "";

    products.forEach((product) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${product.name}</h3>
        <p>Price: ${product.price}</p>
        <p>Stock: ${product.stock}</p>
        <input type="number" min="1" value="1" id="qty-${product.id}">
        <button data-id="${product.id}">Order</button>
      `;
      productsDiv.appendChild(card);
    });

    document.querySelectorAll("button[data-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const productId = Number(button.dataset.id);
        const quantityInput = document.getElementById(`qty-${productId}`);
        const quantity = Number(quantityInput.value);

        if (!quantity || quantity < 1) {
          messageDiv.textContent = "Please enter a valid quantity.";
          return;
        }

        try {
          const orderResponse = await fetch(`${ORDER_API}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product_id: productId, quantity })
          });

          const data = await orderResponse.json();

          if (!orderResponse.ok) {
            throw new Error(data.error || "Order failed");
          }

          messageDiv.style.color = "green";
          messageDiv.textContent = `Order created. ID: ${data.id}, total: ${data.total_price}`;
          loadProducts();
        } catch (error) {
          messageDiv.style.color = "#b00020";
          messageDiv.textContent = error.message;
        }
      });
    });
  } catch (error) {
    messageDiv.style.color = "#b00020";
    messageDiv.textContent = "Could not load products.";
  }
}

document.getElementById("refresh-products").addEventListener("click", loadProducts);

loadProducts();
