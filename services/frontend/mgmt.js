const PRODUCT_API = "/api";

let adminUser = "";
let adminPassword = "";

document.getElementById("login-button").addEventListener("click", () => {
  adminUser = document.getElementById("username").value;
  adminPassword = document.getElementById("password").value;
  const loginMessage = document.getElementById("login-message");

  if (!adminUser || !adminPassword) {
    setMessage(loginMessage, "Username and password are required.");
    return;
  }

  if (adminUser !== "admin" || adminPassword !== "admin") {
    setMessage(loginMessage, "Invalid username or password.");
    return;
  }

  setMessage(loginMessage, "");
  document.getElementById("login").style.display = "none";
  document.getElementById("admin").style.display = "block";
  loadAdminProducts();
});

document.getElementById("refresh-admin-products").addEventListener("click", loadAdminProducts);

async function loadAdminProducts() {
  const productsDiv = document.getElementById("admin-products");
  const messageDiv = document.getElementById("admin-message");

  try {
    const products = await fetchJson(`${PRODUCT_API}/products`);
    setMessage(messageDiv, "");
    renderCards(productsDiv, products, (product) => `
        <h3>${product.name}</h3>
        <p>ID: ${product.id}</p>
        <label>Price:</label>
        <input type="number" min="0" step="0.01" value="${product.price}" id="price-${product.id}">
        <label>Stock:</label>
        <input type="number" min="0" value="${product.stock}" id="stock-${product.id}">
        <button data-id="${product.id}">Save</button>
      `);

    document.querySelectorAll("button[data-id]").forEach((button) => {
      button.addEventListener("click", () => updateProduct(Number(button.dataset.id)));
    });
  } catch (error) {
    setMessage(messageDiv, "Could not load products.");
  }
}

async function updateProduct(productId) {
  const messageDiv = document.getElementById("admin-message");
  const price = Number(document.getElementById(`price-${productId}`).value);
  const stock = Number(document.getElementById(`stock-${productId}`).value);

  if (price < 0 || stock < 0) {
    setMessage(messageDiv, "Price and stock must be valid numbers.");
    return;
  }

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

    setMessage(messageDiv, "Product updated.");
    loadAdminProducts();
  } catch (error) {
    setMessage(messageDiv, error.message);
  }
}
