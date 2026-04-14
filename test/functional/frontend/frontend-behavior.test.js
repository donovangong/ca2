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
  const sharedCode = fs.readFileSync(sharedPath, "utf8");
  const code = fs.readFileSync(filePath, "utf8");
  const context = {
    document,
    fetch: fetchMock,
    Number,
    Date,
    Error,
    console
  };

  vm.createContext(context);
  new vm.Script(sharedCode, { filename: sharedPath }).runInContext(context);
  new vm.Script(code, { filename: filePath }).runInContext(context);
  return context;
}

test("products can be loaded and rendered", async () => {
  const document = createFakeDocument(["products", "message", "refresh-products"]);
  const products = [
    { id: 1, name: "Keyboard", price: "49.99", stock: 10 },
    { id: 2, name: "Mouse", price: "19.99", stock: 20 }
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
  await new Promise((resolve) => setImmediate(resolve));

  const productsHtml = document.getElementById("products").innerHTML;

  assert.deepStrictEqual(fetchCalls, ["/api/products"]);
  assert.ok(productsHtml.includes("Keyboard"));
  assert.ok(productsHtml.includes("Mouse"));
  assert.ok(productsHtml.includes("Stock: 10"));
});

test("orders can be loaded and rendered", async () => {
  const document = createFakeDocument(["orders"]);
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
  await new Promise((resolve) => setImmediate(resolve));

  const ordersHtml = document.getElementById("orders").innerHTML;

  assert.deepStrictEqual(fetchCalls, ["/api/orders"]);
  assert.ok(ordersHtml.includes("ID: 10"));
  assert.ok(ordersHtml.includes("Product ID: 1"));
  assert.ok(ordersHtml.includes("Total Price: 99.98"));
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
  await new Promise((resolve) => setImmediate(resolve));

  document.getElementById("price-1").value = "59.99";
  document.getElementById("stock-1").value = "15";

  const saveButton = document.buttons.find((button) => button.dataset.id === "1");
  assert.ok(saveButton, "management page should render a save button for product 1");

  await saveButton.click();
  await new Promise((resolve) => setImmediate(resolve));

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
