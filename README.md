# 🛵 Magway Food Delivery System (Reactive Full-Stack Application)

A real-time, reactive food delivery management platform built for **Magway, Myanmar**. The system connects **Customers**, **Riders**, and **Administrators** using non-blocking reactive streams, live WebSocket GPS tracking, Server-Sent Events (SSE), and OAuth2/OIDC role-based security.

---

## ✨ Key Features

- **Role-Based Access Control (RBAC):** Centralized identity and JWT authentication powered by **Keycloak** (`ADMIN`, `RIDER`, and `CUSTOMER` roles).
- **Customer Portal:** Browse Magway restaurants and menus, manage carts, place orders with map pin drop-off locations, and track order progress in real time.
- **Admin Dashboard & Smart Dispatch:** Manage restaurants, food menus, riders, and incoming orders. Uses **Redis** and the Haversine distance formula to scan and assign the nearest available rider, plus a dedicated live GPS tracking modal for active riders.
- **Rider Mobile Portal:** Mobile-optimized HTTPS interface streaming live hardware GPS coordinates over **WebSockets (`wss://`)**, step-by-step restaurant pickup and customer drop-off navigation, and one-tap order completion.
- **Pre-Seeded Database & Accounts:** Automatically imports pre-configured Magway restaurants, menu items, uploaded images, and Keycloak user accounts on first container startup.

---

## 🏗️ Tech Stack & Architecture

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Angular (Standalone Components, Signals, Reactive Forms), Tailwind CSS, Leaflet Maps |
| **Reverse Proxy & SSL** | Nginx (Serves Angular SPA over HTTP `:4200` and HTTPS `:4443`, proxies `/api`, `/ws`, and `/images`) |
| **Backend** | Java 17, Spring Boot 3 (Spring WebFlux / Project Reactor), Spring Security OAuth2 Resource Server |
| **Database & Caching** | Reactive MongoDB (Primary Data Store) & Redis (Rider Availability Pool & Geo/State Caching) |
| **Identity Provider** | Keycloak 26 (OAuth2 / OpenID Connect, Realm & User Auto-Import) |
| **Containerization** | Docker & Docker Compose |

---

## 📂 Project Structure

```text
MagwayDeliverySystem/
├── delivery-frontend/              # Angular Frontend & Nginx Reverse Proxy
│   ├── src/                        # Angular components, services, guards, and environments
│   ├── nginx.conf                  # HTTPS/WSS reverse proxy configuration
│   └── Dockerfile                  # Multi-stage Node 20 build + Nginx Alpine server
├── DeliveySystem-WebFlux/          # Spring Boot Reactive Backend & Infrastructure
│   ├── src/                        # Reactive controllers, services, repositories, and security config
│   ├── ssl/                        # Self-signed SSL certificates for HTTPS (port 4443)
│   ├── uploads/                    # Pre-loaded restaurant, food, and profile images
│   ├── keycloak-themes/            # Custom Keycloak login theme
│   ├── delivery_db.archive         # Pre-populated MongoDB database dump (Magway restaurants & menus)
│   ├── mongo-init.sh               # Automatic MongoDB restore script executed on first boot
│   ├── realm-export.json           # Pre-configured Keycloak realm, client, roles, and default users
│   ├── .env                        # Environment variables (External IP & Keycloak Client Secret)
│   └── docker-compose.yml          # Full 5-container orchestration
└── README.md

🔑 Default Login Credentials (No Sign-Up Required)

All accounts below are pre-loaded into Keycloak (realm-export.json) and MongoDB (delivery_db.archive) so you can log in and test immediately after starting the containers:

  1. Application Accounts (https://localhost:4443/login)

    Role     EmailAddress                       Password            Portal Route
    Admin    admin@gmail.com                    admin123           /admin
    Rider    (Or create via Admin -> Riders)   (Set by Admin)      /rider
    Customer (Or sign up at /signup)           (User defined)      /customer

    Note: If you have existing Rider or Customer test emails, you can log in directly on the same /login page—the system automatically routes each user based on their Keycloak JWT role.
    
  2. Keycloak Administration Console (http://localhost:9090)

   Username: adminPassword: adminRealm: delivery-realm
   
  🚀 Getting Started (Run with Docker)
      Prerequisite
      sDocker Desktop installed and running.
      Ports 4200, 4443, 8080, 9090, 27018, and 6379 available on your machine.Step 1: Clone the Repository

      Step 1: Clone the Repository

         git clone <YOUR_GITHUB_REPO_URL>
         cd MagwayDeliverySystem/DeliveySystem-WebFlux

      Step 2: Check Environment Variables (.env)
         A .env file is already included in DeliveySystem-WebFlux/.env:

         EXTERNAL_URL=192.168.137.1
         KEYCLOAK_SECRET=eYqrNh1synVireGqr4fXP2T4ys2p3hR4   

      Step 3: Build and Start All Containers
      Run the following command inside the DeliveySystem-WebFlux directory:  

         docker-compose up -d --build 

   🌐 Accessing the Application
   Once the containers are running, open your browser:

      1. HTTPS Frontend (Recommended — Required for Browser Geolocation & Rider GPS):

         Local PC: https://localhost:4443

         Mobile / LAN Hotspot: https://<YOUR_PC_IP>:4443 (e.g., https://192.168.137.1:4443)

         Note: Because the project uses a local self-signed SSL certificate, your browser will show a "Your connection is not private" warning on first visit. Click Advanced -> Proceed to localhost (unsafe) to open the app.

      2.HTTP Frontend (Alternative Local Access):

         http://localhost:4200

      3.Backend API Base URL:

         Proxied via Nginx: https://localhost:4443/api/...

         Direct Container Port: http://localhost:8080/api/...

      4.Keycloak Admin Console:

         http://localhost:9090

   🗄️ Resetting or Re-Seeding the Database
      MongoDB only executes /docker-entrypoint-initdb.d/mongo-init.sh when the mongo_data volume is empty. If you ever want to reset the database and Keycloak back to the clean snapshot included in this repository, run:

            docker-compose down -v
            docker-compose up -d

      To manually restore delivery_db.archive into a running MongoDB container at any time without wiping volumes:

            docker exec -i delivery-mongo sh -c "mongorestore --archive" < delivery_db.archive
