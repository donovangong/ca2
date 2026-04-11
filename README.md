# Order Inventory System

## Project Summary

This is the DevOps project for EAD CA2, it is an Order and Inventory system.

The system contains:

- A plain HTML frontend
- A product service built with Node.js and Express
- An order service built with Node.js and Express
- A PostgreSQL database
- Docker, Kubernetes, and Helm configuration for local deployment

## Frontend Pages

The frontend is located in:

```text
services/frontend
```

Pages:

- `index.html`: shows products, lets the user enter quantity and place an order
- `orders.html`: shows all created orders
- `mgmt.html`: management page for updating product price and stock, login with admin:admin

## Backend Services

### Product Service

Location:

```text
services/product-service
```

Main file:

```text
server.js
```

Endpoints:

- `GET /products`
- `GET /products/:id`
- `PUT /products/:id`
- `GET /health`

This service connects to PostgreSQL and manages product data.

### Order Service

Location:

```text
services/order-service
```

Main file:

```text
server.js
```

Endpoints:

- `POST /orders`
- `GET /orders`
- `GET /orders/:id`
- `GET /health`

This service calls the product service, calculates the total order price, saves the order, and reduces product stock.

## Resource Configuration

Resource and deployment files are located in:

```text
resources
```

Folders:

- `resources/db`: database initialization SQL
- `resources/k8s`: Kubernetes YAML files
- `resources/helm`: Helm chart

The GitHub Actions workflow builds the Docker images, imports them into k3s, clears the old deployment, and deploys the Helm chart.

The Helm chart is located at:

```text
resources/helm/ca2
```

## Database

The system uses PostgreSQL.

Tables:

- `products`
- `orders`

Default database values:

- User: `postgres`
- Password: `postgres`
- Database: `orders_db`

## Run Locally With Docker Compose

Local URLs:

- Frontend: `http://localhost`
- Product API: `http://localhost:3001/products`
- Order API: `http://localhost:3002/orders`
