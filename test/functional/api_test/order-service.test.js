const assert = require("assert");
const test = require("node:test");
const {
  PRODUCT_SERVICE_URL,
  ORDER_SERVICE_URL,
  request,
  assertJsonArray,
  adminHeaders
} = require("../helpers/http");

let productForOrder;
let originalProduct;
let createdOrder;

test.before(async () => {
  const products = await assertJsonArray(PRODUCT_SERVICE_URL, "/products");
  productForOrder = products.find((product) => Number(product.stock) > 0);

  assert.ok(productForOrder, "at least one product must have stock for order tests");

  originalProduct = {
    price: Number(productForOrder.price),
    stock: Number(productForOrder.stock)
  };
});

test.after(async () => {
  if (!productForOrder || !originalProduct) {
    return;
  }

  await request(PRODUCT_SERVICE_URL, `/products/${productForOrder.id}`, {
    method: "PUT",
    headers: adminHeaders(),
    body: JSON.stringify(originalProduct)
  });
});

test("GET /health returns 200", async () => {
  const response = await request(ORDER_SERVICE_URL, "/health");

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.status, "ok");
  assert.strictEqual(response.body.service, "order-service");
});

test("GET /orders returns 200 and an array", async () => {
  const orders = await assertJsonArray(ORDER_SERVICE_URL, "/orders");

  assert.ok(Array.isArray(orders));
});

test("GET /api/orders also returns 200 and an array", async () => {
  const orders = await assertJsonArray(ORDER_SERVICE_URL, "/api/orders");

  assert.ok(Array.isArray(orders));
});

test("POST /orders with valid product_id and quantity creates an order", async () => {
  const quantity = 1;
  const currentProductResponse = await request(PRODUCT_SERVICE_URL, `/products/${productForOrder.id}`);
  const currentProduct = currentProductResponse.body;

  assert.strictEqual(currentProductResponse.status, 200);

  const response = await request(ORDER_SERVICE_URL, "/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: productForOrder.id,
      quantity
    })
  });

  assert.strictEqual(response.status, 201);
  assert.ok(response.body.id);
  assert.strictEqual(response.body.product_id, productForOrder.id);
  assert.strictEqual(response.body.quantity, quantity);

  const expectedTotal = Number(currentProduct.price) * quantity;
  assert.strictEqual(Number(response.body.total_price), expectedTotal);

  createdOrder = response.body;
});

test("created order appears in GET /orders result", async () => {
  assert.ok(createdOrder, "valid order test must create an order first");

  const orders = await assertJsonArray(ORDER_SERVICE_URL, "/orders");
  const matchingOrder = orders.find((order) => order.id === createdOrder.id);

  assert.ok(matchingOrder, "orders table should contain the newly created order");
  assert.strictEqual(matchingOrder.product_id, productForOrder.id);
});

test("POST /orders with invalid quantity returns 400", async () => {
  const response = await request(ORDER_SERVICE_URL, "/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: productForOrder.id,
      quantity: 0
    })
  });

  assert.strictEqual(response.status, 400);
  assert.ok(response.body.error);
});

test("POST /orders with invalid product_id returns an error", async () => {
  const response = await request(ORDER_SERVICE_URL, "/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: 999999,
      quantity: 1
    })
  });

  assert.ok(response.status >= 400);
  assert.ok(response.body.error);
});
