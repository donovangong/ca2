const PRODUCT_API = "/api";
const ORDER_API = "/api";

async function loadProducts() {
  const productsDiv = document.getElementById("products");
  const messageDiv = document.getElementById("message");

  try {
    showLoadingState(productsDiv, "Loading products...");
    const products = await fetchJson(`${PRODUCT_API}/products`);

    clearMessage(messageDiv);

    if (!products.length) {
      renderEmptyState(
        productsDiv,
        "No products available right now.",
        "Please check back later or refresh the inventory."
      );
      return;
    }

    renderCards(productsDiv, products, (product) => {
      const stockClass = product.stock > 10
        ? "status-success"
        : product.stock > 0
          ? "status-warning"
          : "status-danger";

      const stockLabel = product.stock > 10
        ? "In stock"
        : product.stock > 0
          ? "Low stock"
          : "Out of stock";

      return `
        <div class="product-card-head">
          <div>
            <span class="card-label">Product #${product.id}</span>
            <h3>${escapeHtml(product.name)}</h3>
          </div>
          <span class="status-badge ${stockClass}">${stockLabel}</span>
        </div>

        <div class="metric-row">
          <div class="metric">
            <span class="metric-label">Price</span>
            <strong>${formatCurrency(product.price)}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">Stock</span>
            <strong>${product.stock}</strong>
          </div>
        </div>

        <div class="field-group">
          <label for="qty-${product.id}">Quantity</label>
          <input
            class="input"
            type="number"
            min="1"
            value="1"
            id="qty-${product.id}"
            ${product.stock === 0 ? "disabled" : ""}
          />
        </div>

        <button
          class="btn btn-primary order-btn"
          data-id="${product.id}"
          type="button"
          ${product.stock === 0 ? "disabled" : ""}
        >
          ${product.stock === 0 ? "Unavailable" : "Place order"}
        </button>
      `;
    });

    document.querySelectorAll(".order-btn[data-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const productId = Number(button.dataset.id);
        const quantityInput = document.getElementById(`qty-${productId}`);
        const quantity = Number(quantityInput.value);

        if (!quantity || quantity < 1) {
          setMessage(messageDiv, "Please enter a valid quantity.", "error");
          return;
        }

        button.disabled = true;
        button.textContent = "Processing...";

        try {
          const data = await fetchJson(`${ORDER_API}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product_id: productId, quantity })
          });

          setMessage(
            messageDiv,
            `Order #${data.id} created successfully. Total: ${formatCurrency(data.total_price)}.`,
            "success"
          );

          await loadProducts();
        } catch (error) {
          setMessage(messageDiv, error.message, "error");
          button.disabled = false;
          button.textContent = "Place order";
        }
      });
    });
  } catch (error) {
    setMessage(messageDiv, "Could not load products.", "error");
    renderEmptyState(
      productsDiv,
      "We couldn't load the product list.",
      "Please refresh the page and try again."
    );
  }
}

document.getElementById("refresh-products").addEventListener("click", loadProducts);

loadProducts();