# Magway Delivery System

A comprehensive, reactive full-stack delivery management application serving the Magway area. This system handles multi-role workflows, real-time rider tracking, and secure identity management.

## Architecture & Tech Stack

* **Backend:** Java 17, Spring Boot WebFlux, Project Reactor
* **Frontend:** Angular (Functional architecture, standalone components)
* **Identity & Access Management:** Keycloak
* **Database & Caching:** MongoDB, Redis
* **Real-time Communication:** Server-Sent Events (SSE) and WebSockets
* **Infrastructure:** Docker, NGINX reverse proxy

## Core Features

* **Reactive Data Flow:** End-to-end non-blocking architecture utilizing Spring WebFlux and MongoDB.
* **Role-Based Access Control:** Secure authentication flows and endpoints managed entirely through Keycloak.
* **Live GPS Tracking:** Administrators can monitor rider locations in real-time via a dedicated, isolated map modal powered by SSE.
* **Streamlined Interfaces:** Optimized customer management interfaces (user deletion disabled by design) and targeted filtering parameters.

## Prerequisites

* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Ensure WSL 2 integration is enabled if running on Windows)
* Git

## First-Time Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/IamMiller223/MagwayDeliverySystem.git](https://github.com/IamMiller223/MagwayDeliverySystem.git)
   cd MagwayDeliverySystem

2. **Configure Environment Variables:**
   You must create a local environment file before starting the containers. Docker will fail to build the backend without it.
   ```bash
   cd MagwayDeliverySystem/DeliverySystem-WebFlux
   cp .env.example .env