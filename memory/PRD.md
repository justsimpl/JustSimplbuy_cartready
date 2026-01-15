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
- Admin Panel for Users, Orders, Shipments
- Forgot Password functionality
- Admin Audit Logging

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Cache**: Redis (product caching, sessions, rate limiting)
- **Auth**: JWT-based

## What's Been Implemented

### Phase 1 - Core Product Features (Jan 2025)
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
- [x] Role-based admin authentication

### Phase 3 - Security Features (Jan 7, 2025)
- [x] Forgot Password flow (token-based, dev mode returns token)
- [x] Reset Password with token verification
- [x] Admin Forgot Password page
- [x] Admin Audit Logging for all CRUD operations
- [x] Audit Logs viewer page with filters (action, resource type)
- [x] Password reset audit trail

### Phase 4 - Redis Caching (Jan 7, 2025)
- [x] Product data caching (5 min TTL for single products, 2 min for lists)
- [x] Session storage in Redis (24 hour TTL)
- [x] Rate limiting middleware (30/min anonymous, 100/min users, 200/min admins)
- [x] Cache stats endpoint for admins
- [x] Cache invalidation endpoint for admins

## API Endpoints

### Public APIs
- `GET /api/products` - List/search products with filters
- `GET /api/products/{id}` - Product details
- `GET /api/categories` - All categories
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Password Reset APIs (Public)
- `POST /api/auth/forgot-password` - Request password reset token
- `GET /api/auth/verify-reset-token/{token}` - Verify reset token
- `POST /api/auth/reset-password` - Reset password with token

### User APIs (Auth Required)
- `GET /api/wishlist` - User's wishlist
- `POST /api/wishlist` - Add to wishlist
- `DELETE /api/wishlist/{product_id}` - Remove from wishlist
- `GET /api/alerts` - User's price alerts
- `POST /api/alerts` - Create price alert
- `GET /api/saved-searches` - User's saved searches
- `POST /api/saved-searches` - Save a search
- `POST /api/compare` - Compare products

### Admin APIs (Admin Auth Required)
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
- `GET /api/admin/audit-logs` - View audit logs (with pagination/filters)
- `GET /api/admin/audit-logs/actions` - Get filter options for audit logs
- `GET /api/admin/cache/stats` - Redis cache statistics
- `POST /api/admin/cache/invalidate/products` - Clear product cache

### Rate Limiting & Session APIs
- `GET /api/rate-limit/status` - Get current rate limit status
- `POST /api/auth/logout` - Logout and clear sessions
- `GET /api/auth/sessions` - Get active session count

## Tech Notes
- Amazon PA-API: Currently using MOCK data. Add credentials to integrate real API.
- Price history is generated mock data (30 days)
- JWT tokens expire after 24 hours
- Reset tokens expire after 1 hour
- Order statuses: pending, confirmed, processing, shipped, delivered, cancelled, refunded
- Shipment statuses: pending, picked_up, in_transit, out_for_delivery, delivered, failed, returned
- Supported carriers: UPS, FedEx, USPS, DHL, Amazon Logistics
- Audit logs track: CREATE, UPDATE, DELETE, PASSWORD_RESET_REQUEST, PASSWORD_RESET_COMPLETE
- Redis caching: Products cached for 5 min, lists for 2 min, sessions for 24 hours
- Rate limits: Anonymous 30/min, Authenticated 100/min, Admin 200/min

## Credentials
- **Admin Account**: admin@pricewise.com / admin123
- **Database**: Uses MONGO_URL and DB_NAME from /app/backend/.env

## Prioritized Backlog

### P0 (Complete)
- [x] Core search functionality
- [x] Product display with price history
- [x] User authentication
- [x] Wishlists and alerts
- [x] Admin panel for users, orders, shipments
- [x] Forgot password functionality
- [x] Admin audit logging

### P1 (Next Phase)
- [ ] Real Amazon PA-API integration (waiting for user credentials)
- [ ] Email service for password reset emails (currently token-only)
- [ ] Price alert email notifications

### P2 (Future)
- [ ] Price prediction using ML
- [ ] Social sharing features
- [ ] Browser extension
- [ ] Analytics dashboard
- [ ] Price history chart on product detail page

## Next Tasks
1. Test full checkout flow with Stripe test mode
2. Add email notifications for order confirmations
