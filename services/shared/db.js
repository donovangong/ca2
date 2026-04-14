const { Pool } = require("pg");

function createPool() {
  return new Pool({
    host: process.env.DB_HOST || "postgres",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "orders_db",
    port: 5432
  });
}

module.exports = {
  createPool
};
