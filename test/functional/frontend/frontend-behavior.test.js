const assert = require("assert");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const vm = require("vm");
const { createFakeDocument } = require("../helpers/fake-env");

const root = path.resolve(__dirname, "..", "..", "..");
const frontendDir = path.join(root, "services", "frontend");

function runFrontendScript(fileName, document, fetchMock) {
  const filePath = path.join(frontendDir, fileName);
  const sharedPath = path.join(frontendDir, "shared.js");
  const context = {
    document,
    fetch: fetchMock,
    Number,
    Date,
    Error,
    Intl,
    console
  };

  vm.createContext(context);
  new vm.Script(
    `${fs.readFileSync(sharedPath, "utf8")}\nthis.__shared = { fetchJson, formatDateTime, escapeHtml };`,
    { filename: sharedPath }
  ).runInContext(context);

  if (filePath !== sharedPath) {
    new vm.Script(fs.readFileSync(filePath, "utf8"), { filename: filePath }).runInContext(context);
  }

  return context;
}

async function waitFor(predicate, message) {
  const deadline = Date.now() + 1000;

  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  assert.fail(message);
}

test("products can be loaded and rendered", async () => {
  const document = createFakeDocument(["products", "message", "refresh-products"]);
  const products = [
    { id: 1, name: "Keyboard", price: "49.99", stock: 10 },
    { id: 2, name: "Mouse", price: "19.99", stock: 20 },
    { id: 3, name: "Cable", price: "9.99", stock: 0 }
  ];

  const fetchCalls = [];
  const fetchMock = async (url) => {
    fetchCalls.push(url);
    return {
      ok: true,
      json: async () => products
    };
  };

  runFrontendScript("app.js", document, fetchMock);
  await waitFor(
    () => document.getElementById("products").innerHTML.includes("Place order"),
    "products should render stock information"
  );

  const productsHtml = document.getElementById("products").innerHTML;

  assert.deepStrictEqual(fetchCalls, ["/api/products"]);
  assert.ok(productsHtml.includes("Keyboard"));
  assert.ok(productsHtml.includes("Mouse"));
  assert.ok(productsHtml.includes("Stock"));
  assert.ok(productsHtml.includes("<strong>10</strong>"));
  assert.ok(productsHtml.includes("status-success"));
  assert.ok(productsHtml.includes("status-warning"));
  assert.ok(productsHtml.includes("status-danger"));
  assert.ok(productsHtml.includes("Unavailable"));
});

test("product page handles empty lists, failed loads, and order actions", async () => {
  const emptyDocument = createFakeDocument(["products", "message", "refresh-products"]);
  runFrontendScript("app.js", emptyDocument, async () => ({ ok: true, json: async () => [] }));
  await waitFor(
    () => emptyDocument.getElementById("products").innerHTML.includes("No products available"),
    "empty product list should render an empty state"
  );

  const failedDocument = createFakeDocument(["products", "message", "refresh-products"]);
  runFrontendScript("app.js", failedDocument, async () => ({ ok: false, json: async () => ({ error: "down" }) }));
  await waitFor(
    () => failedDocument.getElementById("message").textContent === "Could not load products.",
    "failed product load should show an error"
  );

  const orderDocument = createFakeDocument(["products", "message", "refresh-products"]);
  let orderFailed = false;
  let ordersCreated = 0;
  const fetchMock = async (url, options = {}) => {
    if (!options.method) {
      return {
        ok: true,
        json: async () => [{ id: 4, name: "Desk", price: "99.99", stock: 5 }]
      };
    }

    ordersCreated += 1;
    return {
      ok: !orderFailed,
      json: async () => orderFailed
        ? { error: "Order failed" }
        : { id: 50, total_price: "99.99" }
    };
  };

  runFrontendScript("app.js", orderDocument, fetchMock);
  await waitFor(
    () => orderDocument.buttons.some((button) => button.className.includes("order-btn") && button.dataset.id === "4"),
    "order button should render"
  );

  const button = orderDocument.buttons.find((item) => item.className.includes("order-btn") && item.dataset.id === "4");
  orderDocument.getElementById("qty-4").value = "0";
  await button.click();
  assert.strictEqual(orderDocument.getElementById("message").textContent, "Please enter a valid quantity.");

  orderDocument.getElementById("qty-4").value = "1";
  await button.click();
  await waitFor(() => ordersCreated === 1, "valid order should call the order API");

  orderFailed = true;
  orderDocument.getElementById("qty-4").value = "1";
  await button.click();
  await waitFor(
    () => orderDocument.getElementById("message").textContent === "Order failed",
    "failed order should show API error"
  );
  assert.strictEqual(button.disabled, false);
});

test("orders can be loaded and rendered", async () => {
  const document = createFakeDocument(["orders", "orders-message", "refresh-orders"]);
  const orders = [
    {
      id: 10,
      product_id: 1,
      quantity: 2,
      total_price: "99.98",
      created_at: "2026-04-12T10:00:00.000Z"
    }
  ];

  const fetchCalls = [];
  const fetchMock = async (url) => {
    fetchCalls.push(url);
    return {
      ok: true,
      json: async () => orders
    };
  };

  runFrontendScript("orders.js", document, fetchMock);
  await waitFor(
    () => document.getElementById("orders").innerHTML.includes("ID: 10"),
    "orders should render order information"
  );

  const ordersHtml = document.getElementById("orders").innerHTML;

  assert.deepStrictEqual(fetchCalls, ["/api/orders"]);
  assert.ok(ordersHtml.includes("ID: 10"));
  assert.ok(ordersHtml.includes("Product ID: 1"));
  assert.ok(ordersHtml.includes("Total Price:"));
});

test("orders page handles empty and failed loads", async () => {
  const emptyDocument = createFakeDocument(["orders", "orders-message", "refresh-orders"]);
  runFrontendScript("orders.js", emptyDocument, async () => ({ ok: true, json: async () => [] }));
  await waitFor(
    () => emptyDocument.getElementById("orders").innerHTML.includes("No orders yet"),
    "empty orders should render an empty state"
  );

  const failedDocument = createFakeDocument(["orders", "orders-message", "refresh-orders"]);
  runFrontendScript("orders.js", failedDocument, async () => ({ ok: false, json: async () => ({}) }));
  await waitFor(
    () => failedDocument.getElementById("orders-message").textContent === "Could not load orders.",
    "failed orders should show an error"
  );
});

test("management update flow sends a PUT request with admin headers", async () => {
  const document = createFakeDocument([
    "login",
    "admin",
    "username",
    "password",
    "login-button",
    "login-message",
    "refresh-admin-products",
    "admin-message",
    "admin-products"
  ]);

  document.getElementById("username").value = "admin";
  document.getElementById("password").value = "admin";

  const products = [{ id: 1, name: "Keyboard", price: "49.99", stock: 10 }];
  const fetchCalls = [];

  const fetchMock = async (url, options = {}) => {
    fetchCalls.push({ url, options });

    if (!options.method) {
      return {
        ok: true,
        json: async () => products
      };
    }

    return {
      ok: true,
      json: async () => ({ id: 1, name: "Keyboard", price: "59.99", stock: 15 })
    };
  };

  runFrontendScript("mgmt.js", document, fetchMock);
  await document.getElementById("login-button").click();
  await waitFor(
    () => document.buttons.some((button) => button.className.includes("save-btn") && button.dataset.id === "1" && button.listeners.click),
    "management page should render a clickable save button"
  );

  document.getElementById("price-1").value = "59.99";
  document.getElementById("stock-1").value = "15";

  const saveButton = document.buttons.find((button) => button.className.includes("save-btn") && button.dataset.id === "1");
  assert.ok(saveButton, "management page should render a save button for product 1");

  await saveButton.click();
  await waitFor(
    () => fetchCalls.some((call) => call.options.method === "PUT"),
    "management flow should send a PUT request"
  );

  const putCall = fetchCalls.find((call) => call.options.method === "PUT");

  assert.ok(putCall, "management flow should send a PUT request");
  assert.strictEqual(putCall.url, "/api/products/1");
  assert.strictEqual(putCall.options.headers["x-admin-user"], "admin");
  assert.strictEqual(putCall.options.headers["x-admin-password"], "admin");
  assert.deepStrictEqual(JSON.parse(putCall.options.body), {
    price: 59.99,
    stock: 15
  });
});

test("management page covers login, empty, validation, load, and update errors", async () => {
  const loginDocument = createFakeDocument([
    "login",
    "admin",
    "username",
    "password",
    "login-button",
    "login-message",
    "refresh-admin-products",
    "admin-message",
    "admin-products"
  ]);

  runFrontendScript("mgmt.js", loginDocument, async () => ({ ok: true, json: async () => [] }));
  await loginDocument.getElementById("login-button").click();
  assert.strictEqual(loginDocument.getElementById("login-message").textContent, "Username and password are required.");

  loginDocument.getElementById("username").value = "admin";
  loginDocument.getElementById("password").value = "wrong";
  await loginDocument.getElementById("login-button").click();
  assert.strictEqual(loginDocument.getElementById("login-message").textContent, "Invalid username or password.");

  loginDocument.getElementById("password").value = "admin";
  await loginDocument.getElementById("login-button").click();
  await waitFor(
    () => loginDocument.getElementById("admin-products").innerHTML.includes("No products found"),
    "empty admin products should render an empty state"
  );

  const failedLoadDocument = createFakeDocument([
    "login",
    "admin",
    "username",
    "password",
    "login-button",
    "login-message",
    "refresh-admin-products",
    "admin-message",
    "admin-products"
  ]);
  runFrontendScript("mgmt.js", failedLoadDocument, async () => ({ ok: false, json: async () => ({}) }));
  failedLoadDocument.getElementById("username").value = "admin";
  failedLoadDocument.getElementById("password").value = "admin";
  await failedLoadDocument.getElementById("login-button").click();
  await waitFor(
    () => failedLoadDocument.getElementById("admin-message").textContent === "Could not load products.",
    "failed admin product load should show an error"
  );

  const updateDocument = createFakeDocument([
    "login",
    "admin",
    "username",
    "password",
    "login-button",
    "login-message",
    "refresh-admin-products",
    "admin-message",
    "admin-products"
  ]);
  const fetchMock = async (url, options = {}) => {
    if (!options.method) {
      return {
        ok: true,
        json: async () => [{ id: 7, name: "Stand", price: "10.00", stock: 2 }]
      };
    }

    return { ok: false, json: async () => ({ error: "Update failed" }) };
  };

  runFrontendScript("mgmt.js", updateDocument, fetchMock);
  updateDocument.getElementById("username").value = "admin";
  updateDocument.getElementById("password").value = "admin";
  await updateDocument.getElementById("login-button").click();
  await waitFor(
    () => updateDocument.buttons.some((button) => button.className.includes("save-btn") && button.dataset.id === "7"),
    "admin save button should render"
  );

  const saveButton = updateDocument.buttons.find((button) => button.className.includes("save-btn") && button.dataset.id === "7");
  updateDocument.getElementById("price-7").value = "-1";
  await saveButton.click();
  assert.strictEqual(updateDocument.getElementById("admin-message").textContent, "Price and stock must be valid non-negative numbers.");

  updateDocument.getElementById("price-7").value = "12";
  updateDocument.getElementById("stock-7").value = "3";
  await saveButton.click();
  await waitFor(
    () => updateDocument.getElementById("admin-message").textContent === "Update failed",
    "failed update should show API error"
  );
  assert.strictEqual(saveButton.disabled, false);
});

test("shared helpers cover response parsing and formatting branches", async () => {
  const context = runFrontendScript("shared.js", createFakeDocument(), async (url) => {
    if (url === "bad-json") {
      return { ok: true, json: async () => { throw new Error("bad json"); } };
    }

    if (url === "error-with-message") {
      return { ok: false, json: async () => ({ error: "Specific error" }) };
    }

    return { ok: false, json: async () => ({}) };
  });

  await assert.rejects(() => context.__shared.fetchJson("bad-json"), /Invalid server response/);
  await assert.rejects(() => context.__shared.fetchJson("error-with-message"), /Specific error/);
  await assert.rejects(() => context.__shared.fetchJson("error-without-message"), /Request failed/);
  assert.strictEqual(context.__shared.formatDateTime("not a date"), "Invalid date");
  assert.strictEqual(context.__shared.escapeHtml(`<tag attr="x">'&`), "&lt;tag attr=&quot;x&quot;&gt;&#39;&amp;");
});
