const PRODUCT_API = "/api";
const ORDER_API = "/api";

async function loadProducts() {
  const productsDiv = document.getElementById("products");
  const messageDiv = document.getElementById("message");

  try {
    const products = await fetchJson(`${PRODUCT_API}/products`);
    setMessage(messageDiv, "");
    renderCards(productsDiv, products, (product) => `
        <h3>${product.name}</h3>
        <p>Price: ${product.price}</p>
        <p>Stock: ${product.stock}</p>
        <input type="number" min="1" value="1" id="qty-${product.id}">
        <button data-id="${product.id}">Order</button>
      `);

    document.querySelectorAll("button[data-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const productId = Number(button.dataset.id);
        const quantityInput = document.getElementById(`qty-${productId}`);
        const quantity = Number(quantityInput.value);

        if (!quantity || quantity < 1) {
          setMessage(messageDiv, "Please enter a valid quantity.");
          return;
        }

        try {
          const data = await fetchJson(`${ORDER_API}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product_id: productId, quantity })
          });

          setMessage(messageDiv, `Order created. ID: ${data.id}, total: ${data.total_price}`, "green");
          loadProducts();
        } catch (error) {
          setMessage(messageDiv, error.message, "#b00020");
        }
      });
    });
  } catch (error) {
    setMessage(messageDiv, "Could not load products.", "#b00020");
  }
}

document.getElementById("refresh-products").addEventListener("click", loadProducts);

loadProducts();
