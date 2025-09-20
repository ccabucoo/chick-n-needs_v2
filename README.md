Chick'N Needs v2

Overview
Chick'N Needs is a simple e‑commerce app for poultry supplies. It includes catalog, cart, checkout (COD), orders, reviews, wishlist, profile/addresses, email verification, password reset, and basic notifications.

---------------------------------------------------------------------------------------------------------------------------------------
[ SETTING UP INSTALLATION ]

1. Getting the code
- Option A (Git)
  - Open Windows PowerShell
  - Run:
    git clone https://github.com/ccabucoo/chick-n-needs_v2.git
    cd chick-n-needs_v2
- Option B (ZIP)
  - Download ZIP from the repo page, extract it, then open PowerShell in the extracted folder.

2. Installing dependencies (Command Prompt)
   
- Backend (run inside server/):
  cd paste file path
  cd server
  npm install
- Frontend (run inside client/):
  cd paste file path
  cd client
  npm install
  
[ HOW TO RUN WEBSITE ]

Step-by-step setup (Windows)
1) Start MySQL
   start Apache
   Start MySql

3) Create the database (phpMyAdmin method) ( PAG NASETUP TO DI NA NEED ISETUP ULIT)
   - Open https://chicknneeds.shop/phpmyadmin
   - Click Databases → Create database:
     rename: chicknneeds → Create.
   - Select the chicknneeds DB → Import → Choose file → select database/schema.sql → Go.
     
4) Backend environment ( SERVER )
   - Copy .env (TEXT NOT FOLDER) in server folder and put to chick-n-needs_v2\server folder as is

5) Frontend Environment ( CLIENT )
  - Copy .env (TEXT NOT FOLDER) in CLIENT folder and put to chick-n-needs_v2\client folder as is

7) Start the backend (API)
   cd paste file path
   cd server
   npm run dev
    ( to check api )
   - API runs at https://api.chicknneeds.shop
   - Health: https://api.chicknneeds.shop/api/health

8) Start the frontend (Web)
   cd paste file path
   cd client
   npm run dev
   - App runs at https://chicknneeds.shop
    ( eto yung frontend server o kaya yung website na makikita ng user)

9) Verify login/flows
   - Register a user on the site; check email verification flow (Brevo). In dev without API key, email sending may fail; check server logs for hints.
   - Try login: if 2FA code is required, the server sends/validates a login code.
     
---------------------------------------------------------------------------------------------------------------------------------------

Tech Stack
- Frontend: Vite + React (client/)
- Backend: Node.js + Express + Sequelize (server/)
- Database: MySQL/MariaDB
- Email: Brevo/Sendinblue (transactional emails)

Prerequisites
- Node.js 18+
- MySQL/MariaDB 10.4+
- Brevo/Sendinblue account (optional in dev)

Quick Start (Windows)
1) Database
   - Start MySQL (XAMPP or local service).
   - Create DB and schema: open phpMyAdmin → SQL → run `database/schema.sql`.
   - Optional demo data: run `database/products.sql` for a sample product and image.

2) Backend (API)
   - cd server
   - Copy `.env.example` to `.env` and set values:
     PORT=4000
     NODE_ENV=development
     JWT_SECRET=change_me
     MYSQL_HOST=127.0.0.1
     MYSQL_PORT=3306
     MYSQL_USER=root
     MYSQL_PASSWORD=
     MYSQL_DATABASE=chicknneeds
     PUBLIC_APP_URL=https://chicknneeds.shop
     FRONTEND_URL=https://chicknneeds.shop
     BREVO_API_KEY=your_brevo_key
   - npm install
   - npm run dev

3) Frontend (Web)
   - cd client
   - npm install
   - Create `.env` with:
     VITE_API_URL=https://api.chicknneeds.shop
   - npm run dev

Environment Files
- Never commit real secrets. Keep `server/.env` local (ignored) and use `server/.env.example` for placeholders.

Dependencies
Frontend (client/package.json)
- react, react-dom, react-router-dom, vite

Backend (server/package.json)
- express, sequelize, mysql2, jsonwebtoken, bcryptjs, helmet, express-rate-limit, dotenv, cookie-parser

Database Schema (tables)
- users: id, email, username, first_name, last_name, full_name, email_verified, password_hash, password_history, phone, failed_login_attempts, locked_until, timestamps
- email_tokens: id, token, purpose (verify/login/reset), user_id, timestamps
- addresses: id, line1, line2, barangay, city, state, postal_code, country, phone, user_id, timestamps
- categories: id, name (unique), description, image_url, timestamps
- products: id, name, slug (unique), description, price, stock, attributes(JSON), category_id, timestamps
- product_images: id, url, product_id, timestamps
- cart_items: id, user_id, product_id, quantity, timestamps
- orders: id, user_id, status, subtotal, shipping_fee, total, payment_method, transaction_number(unique), order_time, shipping_address_id, timestamps
- order_items: id, order_id, product_id, quantity, price, timestamps
- reviews: id, user_id, product_id, rating, comment, timestamps
- wishlists: id, user_id, product_id, timestamps
- contact_messages: id, name, email, subject, order_no, message, timestamps

API Highlights
- Auth: /api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/forgot-password, /api/auth/reset-password, /api/auth/verify, /api/auth/refresh
- Products: /api/products (filters + pagination), /api/products/:id
- Reviews: /api/reviews/:productId (GET paginated, POST create)
- Cart: /api/cart (GET/POST), /api/cart/:id (PATCH/DELETE)
- Orders: /api/orders (GET paginated), /api/orders/checkout (POST)
- Profile: /api/profile (GET/PATCH), /api/profile/addresses (POST/PUT/DELETE)
- Wishlist: /api/wishlist (GET/POST/DELETE)
- Notifications: /api/notifications (GET)

Auth & Sessions
- Access token: short‑lived JWT (~15m) sent as Authorization: Bearer <token>; includes jti and can be deny‑listed on logout
- Refresh token: httpOnly, Secure, SameSite=Strict cookie; rotated on refresh and deny‑listed on rotation/logout
- Auto‑refresh: POST /api/auth/refresh issues a new access token when the cookie is valid
- Auto‑logout: client logs out on access‑token expiry and after inactivity timeout
- Email verification required before login completes
- Rate limiting on auth endpoints

Security Notes
- JWT secret required (server exits if missing)
- Rate limiting, Helmet, input sanitization, and centralized error handling
- Products/reviews/orders responses are paginated
- Reviews moderated: 1–1000 chars, basic profanity filtering, links masked

App Flows & Scenarios
Registration (/api/auth/register)
- Success: user created, verification email sent (or logged in console if email not configured); frontend redirects to /verify-sent
- Email already registered: 400 { message: "Email already registered" }
- Username taken: 400 { message: "Username already taken" }
- Weak or invalid input: 400 with validation messages

Email Verification (/api/auth/verify?token=...)
- Success: redirects to frontend /verify with success status
- Invalid/missing token: redirects with error status

Login (/api/auth/login)
- Unverified email: 403 { message: "You must verify your email first..." }
- Wrong credentials: 400 with remaining attempts
- Too many attempts: 423 account lock for 15 minutes
- Second factor: 206 { requiresCode: true, resendIn } → user submits code to complete login
- Success: { token, user } and sets a refresh‑token cookie (httpOnly) for silent token renewal

Logout (/api/auth/logout)
- Clears the refresh‑token cookie and deny‑lists the current tokens; future requests get 401

Forgot Password (/api/auth/forgot-password)
- Always returns success (no email enumeration)
- Rate limited; rejects frequent requests

Reset Password (/api/auth/reset-password)
- Requires CSRF token from /api/auth/csrf-token and strong password
- Rejects expired/invalid tokens and recent password reuse (last 3)

Products (/api/products)
- Supports q, categoryId, sort(name|price|createdAt), order(asc|desc), minPrice, maxPrice, tags, inStock, page, limit
- Returns pagination headers: X-Total-Count, X-Page, X-Limit

Reviews (/api/reviews/:productId)
- GET: paginated, newest first
- POST: requires auth, rating 1–5, comment 1–1000 chars, profanity blocked

Cart & Checkout
- Cart: add/update/remove items; quantities capped; stock checked at checkout
- Checkout: validates address ownership/phone, locks stock, creates order, clears cart

Orders (/api/orders)
- GET: paginated list of user’s orders (newest first)
- GET /api/orders/:id: only owner can access, includes items and shipping address

Profile & Addresses
- GET/PATCH /api/profile: view/edit profile
- Addresses: max 2 saved; full CRUD with ownership checks

Wishlist
- Add/remove products to wishlist; scoped to user

Notifications
- Placeholder endpoint; returns a sample message

Development Notes
- Run server with NODE_ENV=development to include helpful error details; production hides stacks
- Production: prefer httpOnly refresh cookies + short‑lived access tokens (implemented). If mirroring the access token in storage for convenience, scope it carefully and always clear on logout/expiry.

Seeding Examples
Categories
INSERT INTO categories (name, description, image_url, created_at, updated_at) VALUES
('FEEDS AND SUPPLEMENTS','',NULL,NOW(),NOW()),
('HEALTH AND MEDICINE','',NULL,NOW(),NOW()),
('EQUIPMENT AND SUPPLIES','',NULL,NOW(),NOW());

Products
INSERT INTO products (name, slug, description, price, stock, attributes, category_id, created_at, updated_at) VALUES
('Layer Mash','layer-mash','',1200.00,50,NULL,1,NOW(),NOW()),
('Poultry Premix','poultry-premix','',350.00,50,NULL,1,NOW(),NOW());

Image URLs
- Ensure product image URLs match actual filenames served by the API or frontend (e.g. /assets/Layer_Mash.png or frontend /images path).

License
Private/internal project.


System Architecture & Flow
- Backend API
  - Express server under /api/* with Sequelize for MySQL/MariaDB.
  - Middleware: CORS, Helmet, sanitization, rate limiting, request logging, JSON body parsing, centralized error handler.
- Auth & sessions
  - Register → create user → send email verification (Brevo).
  - Verify via /api/auth/verify?token=... → sets emailVerified.
  - Login → optional one-time email code (206) → short-lived JWT (15m) with jti.
  - Logout → /api/auth/logout deny-lists current token jti.
  - Protected routes verify Bearer token + jti not deny-listed.
- Core endpoints
  - Products: filters + pagination; includes Category and ProductImages; adds soldCount.
  - Reviews: paginated list; create with moderation (length/profanity) and rating 1–5.
  - Cart: CRUD by user; stock validated at checkout.
  - Orders: transactional checkout; list/detail with items and shipping address.
  - Profile/Addresses: edit profile; max 2 addresses; ownership checks.
  - Wishlist: add/remove per user.
- Pagination
  - Lists accept page, limit and return X-Total-Count, X-Page, X-Limit headers.
- Error examples surfaced to users
  - Email already registered, username taken, invalid credentials, account locked, unverified email, insufficient stock, address not found/owned, comment too long/inappropriate, 401 for bad/expired/deny-listed token.


Deploying to Hostinger (shared Node.js app)
1) Database
   - hPanel → Databases → MySQL → create DB and user; note host/user/password.
   - phpMyAdmin → select DB → Import → database/schema.sql (then optional database/products.sql).

2) Build frontend locally
   - cd client
   - npm install
   - echo VITE_API_URL=https://YOUR_API_URL > .env (set to your API URL)
   - npm run build (outputs client/dist)

3) Upload frontend
   - hPanel → Files → File Manager → public_html → upload contents of client/dist (index.html at root).
   - If you host images on the site, upload to public_html/images and ensure DB URLs match.

4) Upload backend and create Node app
   - Zip server folder (without node_modules), upload and unzip (outside public_html is fine).
   - hPanel → Advanced → Node.js → Create Application
     - Root: path to server
     - Startup file: src/index.js
     - Node version: 18+
     - Install NPM → Restart
     - Environment variables:
       PORT=4000
       NODE_ENV=production
       JWT_SECRET=your-strong-secret
       MYSQL_HOST=<db host>
       MYSQL_PORT=3306
       MYSQL_USER=<db user>
       MYSQL_PASSWORD=<db password>
       MYSQL_DATABASE=<db name>
       PUBLIC_APP_URL=https://your-domain.com
       FRONTEND_URL=https://your-domain.com
       BREVO_API_KEY=<optional>

5) Point frontend to API
   - Set VITE_API_URL before building (step 2). If using a subdomain for API, create it in hPanel and map it to your Node app.

6) Test
   - Visit https://your-domain.com and try registration/login/catalog/cart/checkout.
   - API health: https://YOUR_API_URL/api/health

Common pitfalls
- CORS mismatch: FRONTEND_URL and PUBLIC_APP_URL must match your site origin (including https).
- Missing JWT secret: server exits at startup.
- SQL import order: run schema.sql before products.sql; verify privileges.
- Image URLs: make sure DB URLs point to where images are hosted.

