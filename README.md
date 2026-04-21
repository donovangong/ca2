# Order Inventory System

[![CI/CD](https://github.com/donovangong/Order_Inventory_System/actions/workflows/M_HQ_Control.yml/badge.svg)](https://github.com/donovangong/Order_Inventory_System/actions/workflows/M_HQ_Control.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=donovangong_ca22&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=donovangong_ca22)
![Docker](https://img.shields.io/badge/docker-ready-blue)
![Kubernetes](https://img.shields.io/badge/kubernetes-k3s%20deployed-326ce5)
![Helm](https://img.shields.io/badge/helm-chart-0f1689)

A cloud-native order and inventory platform built with a microservice architecture, designed for product stock management, order processing, automated deployment, and observability.

## Contributors
- Chenghan Gong
- Ajinkya Sawale

## Overview
The system includes a static frontend, a product service, an order service, and PostgreSQL for persistent storage. It is containerized with Docker and deployed to k3s using Helm.

## Features
- Product inventory and stock management
- Customer order creation and history tracking
- Kubernetes-based deployment with Helm
- Kubernetes Ingress for external traffic routing
- Autoscaling with KEDA
- Monitoring with Prometheus and Grafana
- Centralized log aggregation with Loki and Promtail
- Runtime security monitoring with Falco
- CI/CD with GitHub Actions
- Vulnerability, secret, and misconfiguration scanning with Trivy
- Dependency vulnerability analysis with OWASP Dependency-Check
- Code quality analysis with SonarCloud

## Deployment
The application runs on k3s and is deployed through the Helm chart under `resources/helm/ca2`. The deployment is managed as Infrastructure as Code (IaC), with Kubernetes manifests, Helm templates, Ingress routing, autoscaling, monitoring, and security components versioned in the repository.

## Pipeline
- Runs on a self-hosted GitHub Actions runner
- Uses a central control workflow for pipeline orchestration
- Builds container images and deploys the test environment
- Runs functional, API, and integration tests
- Performs Trivy project scanning for vulnerabilities, secrets, and misconfigurations
- Runs OWASP Dependency-Check and SonarCloud quality checks
- Provisions Falco runtime security monitoring and Loki/Grafana observability
- Completes the final production deployment
- Uses reusable workflow stages to reduce repeated setup work and speed up delivery

## Highlights

### Centralized Workflow Controller
The `M_HQ_Control` workflow orchestrates all individual pipeline stages through reusable workflows, with clear dependencies between test deployment, testing, security checks, monitoring setup, and production deployment.

### Quality-Gated Delivery Flow
Each stage runs only after its required previous stages complete successfully, making the delivery path from test environment to production easier to control and review.

### Faster Pipeline Execution
Container images are built once, tagged for the workflow run, scanned, promoted to the test environment, and then reused for production deployment instead of being rebuilt. This reduces duplicated build/download work and improves delivery efficiency.

### Scalable Pipeline Structure
The workflow is modular, so stages can be added, removed, or reordered with minimal changes to the central controller.

### Observability as Code
Grafana dashboards, data sources, monitoring configuration, and related Helm values are versioned as code, reducing manual post-deployment setup.

### Unified Monitoring and Troubleshooting
Prometheus provides runtime metrics, Loki centralizes logs, and Falco security events are integrated into Grafana to support release validation and root-cause analysis.
