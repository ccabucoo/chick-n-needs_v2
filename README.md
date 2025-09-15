Setup (Windows + XAMPP MySQL)

1) Start MySQL in XAMPP. Create DB:
   - Open phpMyAdmin → SQL → run contents of `database/schema.sql`.

2) Backend
   - cd server
   - copy `.env.example` to `.env` and fill values (MySQL creds, JWT_SECRET). If `.env.example` is not present, create `.env` with the following:
     PORT=4000
     JWT_SECRET=change_me
     MYSQL_HOST=127.0.0.1
     MYSQL_PORT=3306
     MYSQL_USER=root
     MYSQL_PASSWORD=
     MYSQL_DATABASE=chicknneeds
   - npm install
   - npm run dev

3) Frontend
   - cd client
   - npm install
   - Create `.env` with:
     VITE_API_URL=http://localhost:4000
   - npm run dev

Seeding Products/Categories from images
 - In the backend, manually insert initial categories and products via MySQL or create a seed script. Suggested categories based on images:
   - FEEDS AND SUPPLEMENTS
   - HEALTH AND MEDICINE
   - EQUIPMENT AND SUPPLIES
 - Example insert (phpMyAdmin → SQL):
   INSERT INTO categories (name, description, image_url, created_at, updated_at) VALUES
   ('FEEDS AND SUPPLEMENTS','',NULL,NOW(),NOW()),
   ('HEALTH AND MEDICINE','',NULL,NOW(),NOW()),
   ('EQUIPMENT AND SUPPLIES','',NULL,NOW(),NOW());

 - Then create products (map images in /images to products):
   INSERT INTO products (name, slug, description, price, stock, attributes, category_id, created_at, updated_at) VALUES
   ('Layer Mash','layer-mash','', 1200.00, 50, NULL, 1, NOW(), NOW()),
   ('Poultry Premix','poultry-premix','', 350.00, 50, NULL, 1, NOW(), NOW()),
   ('Poultry Vaccine','poultry-vaccine','', 500.00, 50, NULL, 2, NOW(), NOW()),
   ('Poultry Antibiotic','poultry-antibiotic','', 450.00, 50, NULL, 2, NOW(), NOW()),
   ('Poultry Dewormer','poultry-dewormer','', 300.00, 50, NULL, 2, NOW(), NOW()),
   ('Automatic Poultry Drinker','automatic-poultry-drinker','', 900.00, 50, NULL, 3, NOW(), NOW()),
   ('Poultry Feeder','poultry-feeder','', 600.00, 50, NULL, 3, NOW(), NOW()),
   ('Poultry Netting','poultry-netting','', 800.00, 50, NULL, 3, NOW(), NOW());

Email verification
 - Uses SendGrid. If you don’t set SENDGRID_API_KEY, the server prints the verification URL in the console; copy it to the browser to simulate email verification.

Notes
 - This is a functional skeleton (auth, catalog, search/filter/sort, cart, checkout, orders, reviews). Styling is intentionally minimal per request.
 - You can extend with admin dashboard, payments, and notifications service later.

