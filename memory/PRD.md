# PriceWise - Amazon PA-API Catalog Site

## Problem Statement
Build a site based around Amazon's API catalog and PA-API with complete searchability. Features include all Amazon categories, product search with filters, product comparisons, price tracking/alerts, affiliate link generation, and user accounts for wishlists/saved searches.

## User Personas
1. **Deal Hunters** - Looking for best prices on Amazon products
2. **Affiliate Marketers** - Need product data and affiliate links
3. **Price-Conscious Shoppers** - Want price history and alerts

## Core Requirements
- Product search with filters (category, price, rating)
- Product comparison (up to 4 products)
- Price history tracking with charts
- Price drop alerts
- Wishlist management
- Saved searches
- User authentication
- Affiliate link generation

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT-based

## What's Been Implemented (Jan 2025)
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

## API Endpoints
- `GET /api/products` - List/search products with filters
- `GET /api/products/{id}` - Product details
- `GET /api/categories` - All categories
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/wishlist` - User's wishlist (auth)
- `POST /api/wishlist` - Add to wishlist (auth)
- `DELETE /api/wishlist/{product_id}` - Remove from wishlist (auth)
- `GET /api/alerts` - User's price alerts (auth)
- `POST /api/alerts` - Create price alert (auth)
- `GET /api/saved-searches` - User's saved searches (auth)
- `POST /api/saved-searches` - Save a search (auth)
- `POST /api/compare` - Compare products

## Tech Notes
- Amazon PA-API: Currently using MOCK data. Add credentials to integrate real API.
- Price history is generated mock data (30 days)
- JWT tokens expire after 24 hours

## Prioritized Backlog

### P0 (MVP Complete)
- [x] Core search functionality
- [x] Product display with price history
- [x] User authentication
- [x] Wishlists and alerts

### P1 (Next Phase)
- [ ] Real Amazon PA-API integration
- [ ] Email notifications for price alerts
- [ ] Browser extension for quick price checks
- [ ] Product reviews integration

### P2 (Future)
- [ ] Price prediction using ML
- [ ] Social sharing features
- [ ] Category deal newsletters
- [ ] Chrome extension

## Next Tasks
1. Integrate real Amazon PA-API when credentials are provided
2. Add email service for price alert notifications
3. Implement browser notifications
4. Add more product images/data
