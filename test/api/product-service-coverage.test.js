const assert = require("assert");
const test = require("node:test");
const { createApp } = require("../../services/product-service/app");
const { listen, request, queuedPool } = require("./helpers/app-test-server");

const adminHeaders = {
  "Content-Type": "application/json",
  "x-admin-user": "admin",
  "x-admin-password": "admin"
};

async function withApp(pool, callback) {
  const server = await listen(createApp(pool));
  try {
    await callback(server.baseUrl);
  } finally {
    await server.close();
  }
}

async function expect(poolItems, req, expectedStatus, expectedBody) {
  await withApp(queuedPool(poolItems), async (baseUrl) => {
    const response = await request(baseUrl, req.path, req.options);
    assert.strictEqual(response.status, expectedStatus);

    if (expectedBody) {
      assert.deepStrictEqual(response.body, expectedBody);
    }
  });
}

test("product health covers success and database failure", async () => {
  await expect([{ rows: [] }], { path: "/health" }, 200, {
    status: "ok",
    service: "product-service"
  });
  await expect([new Error("db down")], { path: "/health" }, 500, { status: "error" });
});

test("product reads cover list, detail, not found, and failures", async () => {
  const product = { id: 1, name: "Keyboard", price: "49.99", stock: 10 };

  await expect([{ rows: [product] }], { path: "/products" }, 200, [product]);
  await expect([{ rows: [product] }], { path: "/api/products/1" }, 200, product);
  await expect([], { path: "/products/not-a-number" }, 400, { error: "Valid product id is required" });
  await expect([], { path: "/products/0" }, 400, { error: "Valid product id is required" });
  await expect([{ rows: [] }], { path: "/products/999" }, 404, { error: "Product not found" });
  await expect([new Error("list failed")], { path: "/api/products" }, 500, { error: "Failed to fetch products" });
  await expect([new Error("detail failed")], { path: "/products/1" }, 500, { error: "Failed to fetch product" });
});

test("product update covers auth, validation, success, not found, and failure", async () => {
  const product = { id: 1, name: "Keyboard", price: 50.99, stock: 12 };
  const update = {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ price: 50.99, stock: 12 })
  };

  await expect([], {
    path: "/products/1",
    options: { method: "PUT", headers: { "Content-Type": "application/json" }, body: update.body }
  }, 401, { error: "Invalid username or password" });

  await expect([], {
    path: "/products/1",
    options: {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-user": "admin",
        "x-admin-password": "wrong"
      },
      body: update.body
    }
  }, 401, { error: "Invalid username or password" });

  await expect([], {
    path: "/products/nope",
    options: update
  }, 400, { error: "Valid product id is required" });

  await expect([], {
    path: "/products/0",
    options: update
  }, 400, { error: "Valid product id is required" });

  await expect([], {
    path: "/products/1",
    options: { ...update, body: JSON.stringify({ price: -1, stock: 12 }) }
  }, 400, { error: "Valid price and stock are required" });

  await expect([], {
    path: "/products/1",
    options: { ...update, body: JSON.stringify({ price: 10 }) }
  }, 400, { error: "Valid price and stock are required" });

  await expect([], {
    path: "/products/1",
    options: { ...update, body: JSON.stringify({ price: 10, stock: -1 }) }
  }, 400, { error: "Valid price and stock are required" });

  await expect([{ rows: [product] }], { path: "/api/products/1", options: update }, 200, product);
  await expect([{ rows: [] }], { path: "/products/999", options: update }, 404, { error: "Product not found" });
  await expect([new Error("update failed")], { path: "/products/1", options: update }, 500, {
    error: "Failed to update product"
  });
});
