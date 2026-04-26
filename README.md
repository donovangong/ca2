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
- `orders.html`: shows all created orders.
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
- `DELETE /orders/:id`
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

## Autoscaling

Product service and order service use KEDA `ScaledObject` resources.

- Minimum replicas: `1`
- Maximum replicas: `3`
- Trigger: CPU utilization at `60%`

The build/deploy GitHub Actions workflow installs KEDA into the `keda` namespace before deploying the application Helm chart.

## Database

The system uses PostgreSQL.

Tables:

- `products`
- `orders`

Default database values:

- User: `postgres`
- Password: `postgres`
- Database: `orders_db`

## Run Locally

Local URLs:

- Frontend: `http://localhost`
- Product API: `http://localhost:3001/products`
- Order API: `http://localhost:3002/orders`

## Tests and GitHub Actions

Tests are stored in:

```text
test
```

Test groups:

- `test/api`: API endpoint tests for product-service and order-service
- `test/integration`: cross-service tests for order creation, stock updates, and frontend page routing
- `test/functional`: frontend JavaScript behavior tests using a fake DOM

Coverage reports are generated as LCOV files and uploaded as GitHub Actions artifacts for SonarCloud.

GitHub Actions workflows:

- `1_build-and-deploy`: builds Docker images, deploys the Helm chart to k3s, and runs frontend functional tests
- `2_api-test`: runs API tests
- `2_integration-test`: runs integration tests
- `3_sonarqube`: runs SonarCloud static analysis on the self-hosted runner
- `3_dependency-check`: runs OWASP Dependency-Check and uploads the HTML report
- `HQ Control of All workflow`: runs build/deploy/functional tests first, runs API tests and integration tests in parallel, then runs SonarCloud and dependency checks

The test workflows are intended to run on the self-hosted VM runner after deployment. They port-forward the Kubernetes services to localhost before running the Node.js test files.

The SonarCloud workflow expects this GitHub secret:

- `SONAR_TOKEN`
