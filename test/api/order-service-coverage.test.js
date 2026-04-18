const assert = require("assert");
const test = require("node:test");
const { createApp } = require("../../services/order-service/app");
const { listen, request, queuedPool, queuedClient } = require("./helpers/app-test-server");

const adminHeaders = {
  "x-admin-user": "admin",
  "x-admin-password": "admin"
};

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

async function withApp(options, callback) {
  const server = await listen(createApp({
    productServiceUrl: "http://product-service",
    fetch: async () => jsonResponse(200, {}),
    ...options
  }));
  try {
    await callback(server.baseUrl);
  } finally {
    await server.close();
  }
}

async function expect(options, req, expectedStatus, expectedBody) {
  await withApp(options, async (baseUrl) => {
    const response = await request(baseUrl, req.path, req.options);
    assert.strictEqual(response.status, expectedStatus);

    if (expectedBody) {
      assert.deepStrictEqual(response.body, expectedBody);
    }
  });
}

test("order app requires a product service URL", () => {
  const originalUrl = process.env.PRODUCT_SERVICE_URL;
  delete process.env.PRODUCT_SERVICE_URL;

  try {
    assert.throws(() => createApp({ pool: queuedPool(), fetch: async () => jsonResponse(200, {}) }), {
      message: "PRODUCT_SERVICE_URL is required"
    });
  } finally {
    if (originalUrl !== undefined) {
      process.env.PRODUCT_SERVICE_URL = originalUrl;
    }
  }
});

test("order health and reads cover success, missing rows, and database failures", async () => {
  const order = { id: 1, product_id: 1, quantity: 2, total_price: "99.98" };

  await expect({ pool: queuedPool([{ rows: [] }]) }, { path: "/health" }, 200, {
    status: "ok",
    service: "order-service"
  });
  await expect({ pool: queuedPool([new Error("db down")]) }, { path: "/health" }, 500, { status: "error" });
  await expect({ pool: queuedPool([{ rows: [order] }]) }, { path: "/orders" }, 200, [order]);
  await expect({ pool: queuedPool([{ rows: [order] }]) }, { path: "/api/orders/1" }, 200, order);
  await expect({ pool: queuedPool() }, { path: "/orders/not-a-number" }, 400, {
    error: "Valid order id is required"
  });
  await expect({ pool: queuedPool() }, { path: "/orders/0" }, 400, { error: "Valid order id is required" });
  await expect({ pool: queuedPool([{ rows: [] }]) }, { path: "/orders/999" }, 404, { error: "Order not found" });
  await expect({ pool: queuedPool([new Error("list failed")]) }, { path: "/api/orders" }, 500, {
    error: "Failed to fetch orders"
  });
  await expect({ pool: queuedPool([new Error("detail failed")]) }, { path: "/orders/1" }, 500, {
    error: "Failed to fetch order"
  });
});

test("order create covers validation, product lookup, stock, commit, rollback, and fetch failure", async () => {
  const body = (payload) => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  await expect({ pool: queuedPool() }, { path: "/orders", options: body({ product_id: 1, quantity: 0 }) }, 400);
  await expect({ pool: queuedPool() }, { path: "/orders", options: body({ product_id: "bad", quantity: 1 }) }, 400, {
    error: "product_id and valid quantity are required"
  });
  await expect({ pool: queuedPool() }, { path: "/orders", options: body({ product_id: 1, quantity: "bad" }) }, 400, {
    error: "product_id and valid quantity are required"
  });
  await expect({
    pool: queuedPool(),
    fetch: async () => jsonResponse(404, { error: "Product not found" })
  }, { path: "/api/orders", options: body({ product_id: 999, quantity: 1 }) }, 404, { error: "Product not found" });
  await expect({
    pool: queuedPool(),
    fetch: async () => jsonResponse(503, {})
  }, { path: "/api/orders", options: body({ product_id: 999, quantity: 1 }) }, 503, {
    error: "Product lookup failed"
  });
  await expect({
    pool: queuedPool(),
    fetch: async () => jsonResponse(200, { id: 1, price: 10, stock: 1 })
  }, { path: "/orders", options: body({ product_id: 1, quantity: 2 }) }, 400, { error: "Not enough stock" });

  const order = { id: 4, product_id: 1, quantity: 2, total_price: 20 };
  const commitClient = queuedClient([{ rows: [] }, { rows: [order] }, { rows: [] }, { rows: [] }]);
  await expect({
    pool: { connect: async () => commitClient },
    fetch: async () => jsonResponse(200, { id: 1, price: 10, stock: 5 })
  }, { path: "/orders", options: body({ product_id: 1, quantity: 2 }) }, 201, order);
  assert.ok(commitClient.calls.some((call) => call.sql === "COMMIT"));
  assert.strictEqual(commitClient.released, true);

  const rollbackClient = queuedClient([{ rows: [] }, new Error("insert failed"), { rows: [] }]);
  await expect({
    pool: { connect: async () => rollbackClient },
    fetch: async () => jsonResponse(200, { id: 1, price: 10, stock: 5 })
  }, { path: "/orders", options: body({ product_id: 1, quantity: 1 }) }, 500);
  assert.ok(rollbackClient.calls.some((call) => call.sql === "ROLLBACK"));
  assert.strictEqual(rollbackClient.released, true);

  await expect({
    pool: queuedPool(),
    fetch: async () => {
      throw new Error("network down");
    }
  }, { path: "/orders", options: body({ product_id: 1, quantity: 1 }) }, 500);
});

test("order delete covers auth, success, not found, and database failure", async () => {
  await expect({ pool: queuedPool() }, { path: "/orders/1", options: { method: "DELETE" } }, 401, {
    error: "Invalid username or password"
  });
  await expect({ pool: queuedPool() }, {
    path: "/orders/1",
    options: { method: "DELETE", headers: { "x-admin-user": "admin", "x-admin-password": "wrong" } }
  }, 401, { error: "Invalid username or password" });
  await expect({ pool: queuedPool() }, {
    path: "/orders/nope",
    options: { method: "DELETE", headers: adminHeaders }
  }, 400, { error: "Valid order id is required" });
  await expect({ pool: queuedPool() }, {
    path: "/orders/0",
    options: { method: "DELETE", headers: adminHeaders }
  }, 400, { error: "Valid order id is required" });
  await expect({ pool: queuedPool([{ rows: [{ id: 1 }] }]) }, {
    path: "/api/orders/1",
    options: { method: "DELETE", headers: adminHeaders }
  }, 200, { deleted: true, id: 1 });
  await expect({ pool: queuedPool([{ rows: [] }]) }, {
    path: "/orders/999",
    options: { method: "DELETE", headers: adminHeaders }
  }, 404, { error: "Order not found" });
  await expect({ pool: queuedPool([new Error("delete failed")]) }, {
    path: "/orders/1",
    options: { method: "DELETE", headers: adminHeaders }
  }, 500, { error: "Failed to delete order" });
});
