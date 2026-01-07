# PriceWise - Amazon PA-API Catalog Site

## Problem Statement
Build a site based around Amazon's API catalog and PA-API with complete searchability. Features include all Amazon categories, product search with filters, product comparisons, price tracking/alerts, affiliate link generation, and user accounts for wishlists/saved searches.

## User Personas
1. **Deal Hunters** - Looking for best prices on Amazon products
2. **Affiliate Marketers** - Need product data and affiliate links
3. **Price-Conscious Shoppers** - Want price history and alerts
4. **Admin Users** - Manage users, orders, and shipments

## Core Requirements
- Product search with filters (category, price, rating)
- Product comparison (up to 4 products)
- Price history tracking with charts
- Price drop alerts
- Wishlist management
- Saved searches
- User authentication
- Affiliate link generation
- **Admin Panel for Users, Orders, Shipments**

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT-based

## What's Been Implemented (Jan 2025)

### Phase 1 - Core Product Features
- [x] Full backend API with products, categories, auth, wishlist, alerts, saved searches
- [x] Mock product data (16 products across 10 categories)
- [x] Home page with hero search and featured products
- [x] Search page with advanced filters (category, price range, rating, Prime, stock)
- [x] Product detail page with price history chart (30 days)
- [x] Comparison page (up to 4 products side-by-side)
- [x] User registration and login
- [x] Dashboard with wishlist, alerts, saved searches
- [x] Categories browsing page
- [x] Responsive design

### Phase 2 - Admin Panel (Jan 2025)
- [x] Admin Dashboard with stats (users, orders, shipments, revenue)
- [x] Users Management - CRUD operations
- [x] Orders Management - CRUD with status tracking
- [x] Shipments Management - CRUD with carrier tracking
- [x] Status workflows (pending → shipped → delivered)
- [x] Admin sidebar navigation

## API Endpoints

### Public APIs
- `GET /api/products` - List/search products with filters
- `GET /api/products/{id}` - Product details
- `GET /api/categories` - All categories
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### User APIs (Auth Required)
- `GET /api/wishlist` - User's wishlist
- `POST /api/wishlist` - Add to wishlist
- `DELETE /api/wishlist/{product_id}` - Remove from wishlist
- `GET /api/alerts` - User's price alerts
- `POST /api/alerts` - Create price alert
- `GET /api/saved-searches` - User's saved searches
- `POST /api/saved-searches` - Save a search
- `POST /api/compare` - Compare products

### Admin APIs
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/lookups` - Status enums, carriers, shipping methods
- `GET /api/admin/users` - List all users (with search/filter)
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/{id}` - Update user
- `DELETE /api/admin/users/{id}` - Delete user
- `GET /api/admin/orders` - List all orders (with search/filter)
- `POST /api/admin/orders` - Create order
- `PUT /api/admin/orders/{id}` - Update order
- `DELETE /api/admin/orders/{id}` - Delete order
- `GET /api/admin/shipments` - List all shipments (with filter)
- `POST /api/admin/shipments` - Create shipment
- `PUT /api/admin/shipments/{id}` - Update shipment
- `DELETE /api/admin/shipments/{id}` - Delete shipment

## Tech Notes
- Amazon PA-API: Currently using MOCK data. Add credentials to integrate real API.
- Price history is generated mock data (30 days)
- JWT tokens expire after 24 hours
- Order statuses: pending, confirmed, processing, shipped, delivered, cancelled, refunded
- Shipment statuses: pending, picked_up, in_transit, out_for_delivery, delivered, failed, returned
- Supported carriers: UPS, FedEx, USPS, DHL, Amazon Logistics

## Prioritized Backlog

### P0 (MVP Complete)
- [x] Core search functionality
- [x] Product display with price history
- [x] User authentication
- [x] Wishlists and alerts
- [x] Admin panel for users, orders, shipments

### P1 (Next Phase)
- [ ] Real Amazon PA-API integration
- [ ] Email notifications for price alerts
- [ ] Admin authentication/authorization
- [ ] Order email confirmations

### P2 (Future)
- [ ] Price prediction using ML
- [ ] Social sharing features
- [ ] Browser extension
- [ ] Analytics dashboard

## Next Tasks
1. Integrate real Amazon PA-API when credentials are provided
2. Add email service for notifications
3. Implement role-based access control for admin
4. Add order confirmation emails
