const { createPool } = require("../shared/db");
const { express, checkAdmin, configureApp, asyncRoute, healthRoute } = require("../shared/http");
const defaultFetch = require("node-fetch");

function createApp(options = {}) {
  const app = express();
  const pool = options.pool || createPool();
  const fetch = options.fetch || defaultFetch;
  const productServiceUrl = options.productServiceUrl || process.env.PRODUCT_SERVICE_URL || "http://product-service:3001";

  configureApp(app, ["GET", "POST", "DELETE", "OPTIONS"]);

  app.get("/health", healthRoute(pool, "order-service"));

  app.post(["/orders", "/api/orders"], asyncRoute(async (req, res) => {
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity || quantity < 1) {
      return res.status(400).json({ error: "product_id and valid quantity are required" });
    }

    const productResponse = await fetch(`${productServiceUrl}/products/${product_id}`);
    const product = await productResponse.json();

    if (!productResponse.ok) {
      return res.status(productResponse.status).json({ error: product.error || "Product lookup failed" });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ error: "Not enough stock" });
    }

    const totalPrice = Number(product.price) * Number(quantity);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const orderResult = await client.query(
        `INSERT INTO orders (product_id, quantity, total_price)
         VALUES ($1, $2, $3)
         RETURNING id, product_id, quantity, total_price, created_at`,
        [product_id, quantity, totalPrice]
      );

      await client.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [quantity, product_id]);
      await client.query("COMMIT");

      res.status(201).json(orderResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }, "POST /orders", "Failed to create order"));

  app.get(["/orders", "/api/orders"], asyncRoute(async (req, res) => {
    const result = await pool.query(
      "SELECT id, product_id, quantity, total_price, created_at FROM orders ORDER BY id DESC"
    );
    res.json(result.rows);
  }, "GET /orders", "Failed to fetch orders"));

  app.get(["/orders/:id", "/api/orders/:id"], asyncRoute(async (req, res) => {
    const result = await pool.query(
      "SELECT id, product_id, quantity, total_price, created_at FROM orders WHERE id = $1",
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(result.rows[0]);
  }, "GET /orders/:id", "Failed to fetch order"));

  app.delete(["/orders/:id", "/api/orders/:id"], checkAdmin, asyncRoute(async (req, res) => {
    const result = await pool.query(
      "DELETE FROM orders WHERE id = $1 RETURNING id",
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ deleted: true, id: result.rows[0].id });
  }, "DELETE /orders/:id", "Failed to delete order"));

  return app;
}

module.exports = {
  createApp,
  createPool
};
