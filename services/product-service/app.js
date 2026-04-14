const { createPool } = require("../shared/db");
const { express, checkAdmin, configureApp, asyncRoute, healthRoute } = require("../shared/http");

function createApp(pool = createPool()) {
  const app = express();

  configureApp(app, ["GET", "PUT", "OPTIONS"]);

  app.get("/health", healthRoute(pool, "product-service"));

  app.get(["/products", "/api/products"], asyncRoute(async (req, res) => {
    const result = await pool.query("SELECT id, name, price, stock FROM products ORDER BY id");
    res.json(result.rows);
  }, "GET /products", "Failed to fetch products"));

  app.get(["/products/:id", "/api/products/:id"], asyncRoute(async (req, res) => {
    const result = await pool.query(
      "SELECT id, name, price, stock FROM products WHERE id = $1",
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  }, "GET /products/:id", "Failed to fetch product"));

  app.put(["/products/:id", "/api/products/:id"], checkAdmin, asyncRoute(async (req, res) => {
    const { price, stock } = req.body;

    if (price === undefined || stock === undefined || price < 0 || stock < 0) {
      return res.status(400).json({ error: "Valid price and stock are required" });
    }

    const result = await pool.query(
      `UPDATE products
       SET price = $1, stock = $2
       WHERE id = $3
       RETURNING id, name, price, stock`,
      [price, stock, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  }, "PUT /products/:id", "Failed to update product"));

  return app;
}

module.exports = {
  createApp,
  createPool
};
