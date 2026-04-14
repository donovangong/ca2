const PRODUCT_API = "/api";

let adminUser = "";
let adminPassword = "";

document.getElementById("login-button").addEventListener("click", () => {
  adminUser = document.getElementById("username").value.trim();
  adminPassword = document.getElementById("password").value.trim();
  const loginMessage = document.getElementById("login-message");

  if (!adminUser || !adminPassword) {
    setMessage(loginMessage, "Username and password are required.", "error");
    return;
  }

  if (adminUser !== "admin" || adminPassword !== "admin") {
    setMessage(loginMessage, "Invalid username or password.", "error");
    return;
  }

  clearMessage(loginMessage);
  document.getElementById("login").style.display = "none";
  document.getElementById("admin").style.display = "block";
  loadAdminProducts();
});

document.getElementById("refresh-admin-products").addEventListener("click", loadAdminProducts);

async function loadAdminProducts() {
  const productsDiv = document.getElementById("admin-products");
  const messageDiv = document.getElementById("admin-message");

  try {
    showLoadingState(productsDiv, "Loading products...");
    const products = await fetchJson(`${PRODUCT_API}/products`);
    clearMessage(messageDiv);

    if (!products.length) {
      renderEmptyState(
        productsDiv,
        "No products found.",
        "Add inventory data before using the management screen."
      );
      return;
    }

    renderCards(productsDiv, products, (product) => `
      <div class="product-card-head">
        <div>
          <span class="card-label">Product #${product.id}</span>
          <h3>${escapeHtml(product.name)}</h3>
        </div>
      </div>

      <div class="form-grid compact-grid">
        <div class="field-group">
          <label for="price-${product.id}">Price</label>
          <input
            class="input input-wide"
            type="number"
            min="0"
            step="0.01"
            value="${product.price}"
            id="price-${product.id}"
          />
        </div>

        <div class="field-group">
          <label for="stock-${product.id}">Stock</label>
          <input
            class="input input-wide"
            type="number"
            min="0"
            value="${product.stock}"
            id="stock-${product.id}"
          />
        </div>
      </div>

      <div class="panel-actions">
        <button class="btn btn-primary save-btn" data-id="${product.id}" type="button">
          Save changes
        </button>
      </div>
    `);

    document.querySelectorAll(".save-btn[data-id]").forEach((button) => {
      button.addEventListener("click", () => updateProduct(Number(button.dataset.id), button));
    });
  } catch (error) {
    setMessage(messageDiv, "Could not load products.", "error");
    renderEmptyState(
      productsDiv,
      "Unable to load inventory data.",
      "Please refresh and try again."
    );
  }
}

async function updateProduct(productId, button) {
  const messageDiv = document.getElementById("admin-message");
  const price = Number(document.getElementById(`price-${productId}`).value);
  const stock = Number(document.getElementById(`stock-${productId}`).value);

  if (Number.isNaN(price) || Number.isNaN(stock) || price < 0 || stock < 0) {
    setMessage(messageDiv, "Price and stock must be valid non-negative numbers.", "error");
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Saving...";

  try {
    await fetchJson(`${PRODUCT_API}/products/${productId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-user": adminUser,
        "x-admin-password": adminPassword
      },
      body: JSON.stringify({ price, stock })
    });

    setMessage(messageDiv, "Product updated successfully.", "success");
    await loadAdminProducts();
  } catch (error) {
    setMessage(messageDiv, error.message, "error");
    button.disabled = false;
    button.textContent = originalText;
  }
}