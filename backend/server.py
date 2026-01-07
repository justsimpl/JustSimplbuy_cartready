from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import random
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'pricewise-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
RESET_TOKEN_EXPIRATION_HOURS = 1

security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============ MODELS ============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str = "user"
    created_at: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class Product(BaseModel):
    id: str
    asin: str
    title: str
    description: str
    category: str
    subcategory: str
    price: float
    original_price: float
    rating: float
    reviews_count: int
    image_url: str
    affiliate_url: str
    brand: str
    features: List[str]
    price_history: List[dict]
    in_stock: bool
    prime_eligible: bool

class ProductSearchParams(BaseModel):
    query: Optional[str] = None
    category: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_rating: Optional[float] = None
    sort_by: Optional[str] = "relevance"
    page: int = 1
    limit: int = 20

class WishlistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    product_id: str
    added_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PriceAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    product_id: str
    target_price: float
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SavedSearch(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    query: str
    filters: dict = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CreateWishlistItem(BaseModel):
    product_id: str

class CreatePriceAlert(BaseModel):
    product_id: str
    target_price: float

class CreateSavedSearch(BaseModel):
    query: str
    filters: dict = {}

# ============ ADMIN MODELS ============

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "user"  # user, admin

class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None

class AdminUserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str
    orders_count: int = 0

class OrderItem(BaseModel):
    product_id: str
    product_title: str
    quantity: int
    price: float

class OrderCreate(BaseModel):
    user_id: str
    items: List[OrderItem]
    shipping_address: str
    billing_address: str
    payment_method: str = "credit_card"
    notes: Optional[str] = None

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    shipping_address: Optional[str] = None
    billing_address: Optional[str] = None
    notes: Optional[str] = None

class OrderResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    items: List[OrderItem]
    total_amount: float
    status: str
    shipping_address: str
    billing_address: str
    payment_method: str
    notes: Optional[str] = None
    created_at: str
    updated_at: str

class ShipmentCreate(BaseModel):
    order_id: str
    carrier: str
    tracking_number: str
    shipping_method: str = "standard"
    estimated_delivery: Optional[str] = None
    notes: Optional[str] = None

class ShipmentUpdate(BaseModel):
    status: Optional[str] = None
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    shipping_method: Optional[str] = None
    estimated_delivery: Optional[str] = None
    actual_delivery: Optional[str] = None
    notes: Optional[str] = None

class ShipmentResponse(BaseModel):
    id: str
    order_id: str
    carrier: str
    tracking_number: str
    status: str
    shipping_method: str
    estimated_delivery: Optional[str] = None
    actual_delivery: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str

ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]
SHIPMENT_STATUSES = ["pending", "picked_up", "in_transit", "out_for_delivery", "delivered", "failed", "returned"]
CARRIERS = ["UPS", "FedEx", "USPS", "DHL", "Amazon Logistics"]
SHIPPING_METHODS = ["standard", "express", "overnight", "economy"]

# ============ MOCK DATA ============

CATEGORIES = [
    {"id": "electronics", "name": "Electronics", "icon": "Laptop"},
    {"id": "books", "name": "Books", "icon": "Book"},
    {"id": "fashion", "name": "Fashion", "icon": "Shirt"},
    {"id": "home", "name": "Home & Kitchen", "icon": "Home"},
    {"id": "sports", "name": "Sports & Outdoors", "icon": "Dumbbell"},
    {"id": "beauty", "name": "Beauty & Personal Care", "icon": "Sparkles"},
    {"id": "toys", "name": "Toys & Games", "icon": "Gamepad2"},
    {"id": "automotive", "name": "Automotive", "icon": "Car"},
    {"id": "health", "name": "Health & Household", "icon": "Heart"},
    {"id": "garden", "name": "Garden & Outdoor", "icon": "Flower"},
]

def generate_price_history():
    base_price = random.uniform(20, 500)
    history = []
    for i in range(30):
        date = (datetime.now(timezone.utc) - timedelta(days=30-i)).isoformat()
        variation = random.uniform(-0.15, 0.15)
        price = round(base_price * (1 + variation), 2)
        history.append({"date": date, "price": price})
    return history

MOCK_PRODUCTS = [
    {
        "id": "prod-001",
        "asin": "B09V3KXJPB",
        "title": "Sony WH-1000XM5 Wireless Noise Canceling Headphones",
        "description": "Industry-leading noise cancellation with Auto NC Optimizer. Crystal clear hands-free calling with 4 beamforming microphones.",
        "category": "electronics",
        "subcategory": "Headphones",
        "price": 348.00,
        "original_price": 399.99,
        "rating": 4.7,
        "reviews_count": 12453,
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
        "affiliate_url": "https://amazon.com/dp/B09V3KXJPB?tag=pricewise-20",
        "brand": "Sony",
        "features": ["30-hour battery life", "Multipoint connection", "Speak-to-Chat", "Quick Attention Mode"],
        "price_history": generate_price_history(),
        "in_stock": True,
        "prime_eligible": True
    },
    {
        "id": "prod-002",
        "asin": "B0BSHF7WHW",
        "title": "Apple AirPods Pro (2nd Generation)",
        "description": "Active Noise Cancellation, Transparency mode, Adaptive Audio, Personalized Spatial Audio.",
        "category": "electronics",
        "subcategory": "Earbuds",
        "price": 189.99,
        "original_price": 249.00,
        "rating": 4.8,
        "reviews_count": 45678,
        "image_url": "https://images.unsplash.com/photo-1592507595940-edcec54727e2?w=400",
        "affiliate_url": "https://amazon.com/dp/B0BSHF7WHW?tag=pricewise-20",
        "brand": "Apple",
        "features": ["H2 chip", "USB-C charging", "6 hours listening time", "MagSafe compatible"],
        "price_history": generate_price_history(),
        "in_stock": True,
        "prime_eligible": True
    },
    {
        "id": "prod-003",
        "asin": "B0CMZ5L5R2",
        "title": "Apple Watch Series 9 GPS 45mm",
        "description": "With the brightest display ever, powerful health insights, and new ways to stay connected.",
        "category": "electronics",
        "subcategory": "Smartwatches",
        "price": 379.00,
        "original_price": 429.00,
        "rating": 4.6,
        "reviews_count": 8934,
        "image_url": "https://images.unsplash.com/photo-1654208398202-1edef1cf23b5?w=400",
        "affiliate_url": "https://amazon.com/dp/B0CMZ5L5R2?tag=pricewise-20",
        "brand": "Apple",
        "features": ["S9 SiP chip", "Double Tap gesture", "Blood Oxygen", "ECG app"],
        "price_history": generate_price_history(),
        "in_stock": True,
        "prime_eligible": True
    },
    {
        "id": "prod-004",
        "asin": "B09JQMJHXY",
        "title": "Nike Air Max 270 Running Shoes",
        "description": "The Nike Air Max 270 delivers visible cushioning under every step with a large Max Air unit.",
        "category": "fashion",
        "subcategory": "Shoes",
        "price": 129.99,
        "original_price": 150.00,
        "rating": 4.5,
        "reviews_count": 23456,
        "image_url": "https://images.unsplash.com/photo-1625860191460-10a66c7384fb?w=400",
        "affiliate_url": "https://amazon.com/dp/B09JQMJHXY?tag=pricewise-20",
        "brand": "Nike",
        "features": ["Max Air unit", "Mesh upper", "Foam midsole", "Rubber outsole"],
        "price_history": generate_price_history(),
        "in_stock": True,
        "prime_eligible": True
    },
    {
        "id": "prod-005",
        "asin": "B0BDHX8Z7X",
        "title": "Kindle Paperwhite (16 GB) – 6.8\" Display",
        "description": "The best Kindle for reading, anytime, anywhere. Adjustable warm light, waterproof design.",
        "category": "electronics",
        "subcategory": "E-Readers",
        "price": 139.99,
        "original_price": 149.99,
        "rating": 4.7,
        "reviews_count": 67890,
        "image_url": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400",
        "affiliate_url": "https://amazon.com/dp/B0BDHX8Z7X?tag=pricewise-20",
        "brand": "Amazon",
        "features": ["6.8\" display", "Adjustable warm light", "10 weeks battery", "IPX8 waterproof"],
        "price_history": generate_price_history(),
        "in_stock": True,
        "prime_eligible": True
    },
    {
        "id": "prod-006",
        "asin": "B08N5WRWNW",
        "title": "PlayStation 5 Console",
        "description": "Experience lightning-fast loading with an ultra-high speed SSD, deeper immersion with haptic feedback.",
        "category": "electronics",
        "subcategory": "Gaming",
        "price": 499.99,
        "original_price": 499.99,
        "rating": 4.8,
        "reviews_count": 34567,
        "image_url": "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400",
        "affiliate_url": "https://amazon.com/dp/B08N5WRWNW?tag=pricewise-20",
        "brand": "Sony",
        "features": ["Custom SSD", "Ray Tracing", "4K Gaming", "3D Audio"],
        "price_history": generate_price_history(),
        "in_stock": False,
        "prime_eligible": True
    },
    {
        "id": "prod-007",
        "asin": "B0BCNKKZ91",
        "title": "Atomic Habits by James Clear",
        "description": "Tiny Changes, Remarkable Results. No matter your goals, this book offers a proven framework.",
        "category": "books",
        "subcategory": "Self-Help",
        "price": 11.98,
        "original_price": 18.99,
        "rating": 4.9,
        "reviews_count": 123456,
        "image_url": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400",
        "affiliate_url": "https://amazon.com/dp/B0BCNKKZ91?tag=pricewise-20",
        "brand": "Avery",
        "features": ["320 pages", "Hardcover", "New York Times Bestseller", "Translated in 50+ languages"],
        "price_history": generate_price_history(),
        "in_stock": True,
        "prime_eligible": True
    },
    {
        "id": "prod-008",
        "asin": "B0B1WVNL1D",
        "title": "Instant Pot Duo 7-in-1 Electric Pressure Cooker",
        "description": "7-in-1 functionality: pressure cooker, slow cooker, rice cooker, steamer, sauté pan, yogurt maker and warmer.",
        "category": "home",
        "subcategory": "Kitchen Appliances",
        "price": 79.95,
        "original_price": 99.99,
        "rating": 4.7,
        "reviews_count": 89012,
        "image_url": "https://images.unsplash.com/photo-1585515320310-259814833e62?w=400",
        "affiliate_url": "https://amazon.com/dp/B0B1WVNL1D?tag=pricewise-20",
        "brand": "Instant Pot",
        "features": ["6 Quart", "13 Smart Programs", "Stainless Steel", "Dishwasher safe"],
        "price_history": generate_price_history(),
        "in_stock": True,
        "prime_eligible": True
    },
    {
        "id": "prod-009",
        "asin": "B07ZPKN6YR",
        "title": "LEGO Star Wars Millennium Falcon",
        "description": "Build and display the iconic Corellian freighter with intricate details and mini-figures.",
        "category": "toys",
        "subcategory": "Building Sets",
        "price": 159.99,
        "original_price": 169.99,
        "rating": 4.8,
        "reviews_count": 5678,
        "image_url": "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400",
        "affiliate_url": "https://amazon.com/dp/B07ZPKN6YR?tag=pricewise-20",
        "brand": "LEGO",
        "features": ["1353 pieces", "7 mini-figures", "Rotating gun turrets", "Opening cockpit"],
        "price_history": generate_price_history(),
        "in_stock": True,
        "prime_eligible": True
    },
    {
        "id": "prod-010",
        "asin": "B0BCNKK123",
        "title": "Dyson V15 Detect Cordless Vacuum",
        "description": "Reveals hidden dust with a laser. Scientifically proven to detect dust you can't see.",
        "category": "home",
        "subcategory": "Vacuums",
        "price": 649.99,
        "original_price": 749.99,
        "rating": 4.6,
        "reviews_count": 12345,
        "image_url": "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400",
        "affiliate_url": "https://amazon.com/dp/B0BCNKK123?tag=pricewise-20",
        "brand": "Dyson",
        "features": ["Laser dust detection", "LCD screen", "60 min runtime", "HEPA filtration"],
        "price_history": generate_price_history(),
        "in_stock": True,
        "prime_eligible": True
    },
    {
        "id": "prod-011",
        "asin": "B09DFCB66S",
        "title": "Theragun Prime Massage Gun",
        "description": "Powerful, quiet, and connected. Treat muscle pain wherever life takes you.",
        "category": "health",
        "subcategory": "Massage",
        "price": 229.00,
        "original_price": 299.00,
        "rating": 4.5,
        "reviews_count": 7890,
        "image_url": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400",
        "affiliate_url": "https://amazon.com/dp/B09DFCB66S?tag=pricewise-20",
        "brand": "Therabody",
        "features": ["5 speeds", "Bluetooth app", "120 min battery", "QuietForce Technology"],
        "price_history": generate_price_history(),
        "in_stock": True,
        "prime_eligible": True
    },
    {
        "id": "prod-012",
        "asin": "B0C1H26C46",
        "title": "Samsung Galaxy S24 Ultra 256GB",
        "description": "The pinnacle of Galaxy innovation with AI-powered features and S Pen.",
        "category": "electronics",
        "subcategory": "Smartphones",
        "price": 1199.99,
        "original_price": 1299.99,
        "rating": 4.7,
        "reviews_count": 15678,
        "image_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
        "affiliate_url": "https://amazon.com/dp/B0C1H26C46?tag=pricewise-20",
        "brand": "Samsung",
        "features": ["200MP camera", "S Pen included", "Titanium frame", "Galaxy AI"],
        "price_history": generate_price_history(),
        "in_stock": True,
        "prime_eligible": True
    },
    {
        "id": "prod-013",
        "asin": "B0DJYLFMW8",
        "title": "Yeti Rambler 26oz Bottle",
        "description": "Double-wall vacuum insulated bottle that keeps drinks cold or hot for hours.",
        "category": "sports",
        "subcategory": "Water Bottles",
        "price": 35.00,
        "original_price": 40.00,
        "rating": 4.8,
        "reviews_count": 34567,
        "image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400",
        "affiliate_url": "https://amazon.com/dp/B0DJYLFMW8?tag=pricewise-20",
        "brand": "YETI",
        "features": ["18/8 stainless steel", "BPA-free", "Dishwasher safe", "No sweat design"],
        "price_history": generate_price_history(),
        "in_stock": True,
        "prime_eligible": True
    },
    {
        "id": "prod-014",
        "asin": "B08MQZYSVC",
        "title": "CeraVe Moisturizing Cream",
        "description": "Developed with dermatologists, with 3 essential ceramides to restore skin's natural barrier.",
        "category": "beauty",
        "subcategory": "Skincare",
        "price": 16.08,
        "original_price": 19.99,
        "rating": 4.8,
        "reviews_count": 98765,
        "image_url": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400",
        "affiliate_url": "https://amazon.com/dp/B08MQZYSVC?tag=pricewise-20",
        "brand": "CeraVe",
        "features": ["19 oz", "Fragrance-free", "Non-comedogenic", "MVE Technology"],
        "price_history": generate_price_history(),
        "in_stock": True,
        "prime_eligible": True
    },
    {
        "id": "prod-015",
        "asin": "B09G9FPHY6",
        "title": "MacBook Pro 14-inch M3 Pro",
        "description": "The most advanced Mac laptops for demanding workflows. Up to 18 hours of battery life.",
        "category": "electronics",
        "subcategory": "Laptops",
        "price": 1799.00,
        "original_price": 1999.00,
        "rating": 4.9,
        "reviews_count": 8765,
        "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400",
        "affiliate_url": "https://amazon.com/dp/B09G9FPHY6?tag=pricewise-20",
        "brand": "Apple",
        "features": ["M3 Pro chip", "18GB RAM", "512GB SSD", "Liquid Retina XDR"],
        "price_history": generate_price_history(),
        "in_stock": True,
        "prime_eligible": True
    },
    {
        "id": "prod-016",
        "asin": "B0CQRCGJH5",
        "title": "Weber Spirit II E-310 Gas Grill",
        "description": "Three-burner gas grill perfect for family cookouts. GS4 grilling system for consistent heat.",
        "category": "garden",
        "subcategory": "Grills",
        "price": 489.00,
        "original_price": 549.00,
        "rating": 4.6,
        "reviews_count": 4567,
        "image_url": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",
        "affiliate_url": "https://amazon.com/dp/B0CQRCGJH5?tag=pricewise-20",
        "brand": "Weber",
        "features": ["529 sq in cooking area", "30,000 BTU", "iGrill 3 compatible", "10 year warranty"],
        "price_history": generate_price_history(),
        "in_stock": True,
        "prime_eligible": True
    },
]

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    """Dependency that checks if the current user is an admin"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "created_at": created_at
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id, user_data.email)
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "created_at": created_at
        }
    }

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"])
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user.get("role", "user"),
            "created_at": user["created_at"]
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    current_user["role"] = current_user.get("role", "user")
    return current_user

# ============ PRODUCTS ROUTES ============

@api_router.get("/products")
async def get_products(
    query: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    min_rating: Optional[float] = Query(None),
    sort_by: Optional[str] = Query("relevance"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    products = MOCK_PRODUCTS.copy()
    
    # Filter by search query
    if query:
        query_lower = query.lower()
        products = [p for p in products if 
                    query_lower in p["title"].lower() or 
                    query_lower in p["description"].lower() or
                    query_lower in p["brand"].lower() or
                    query_lower in p["category"].lower()]
    
    # Filter by category
    if category:
        products = [p for p in products if p["category"] == category]
    
    # Filter by price range
    if min_price is not None:
        products = [p for p in products if p["price"] >= min_price]
    if max_price is not None:
        products = [p for p in products if p["price"] <= max_price]
    
    # Filter by rating
    if min_rating is not None:
        products = [p for p in products if p["rating"] >= min_rating]
    
    # Sort
    if sort_by == "price_low":
        products.sort(key=lambda x: x["price"])
    elif sort_by == "price_high":
        products.sort(key=lambda x: x["price"], reverse=True)
    elif sort_by == "rating":
        products.sort(key=lambda x: x["rating"], reverse=True)
    elif sort_by == "reviews":
        products.sort(key=lambda x: x["reviews_count"], reverse=True)
    
    # Pagination
    total = len(products)
    start = (page - 1) * limit
    end = start + limit
    products = products[start:end]
    
    return {
        "products": products,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = next((p for p in MOCK_PRODUCTS if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.get("/categories")
async def get_categories():
    return CATEGORIES

# ============ WISHLIST ROUTES ============

@api_router.get("/wishlist")
async def get_wishlist(current_user: dict = Depends(get_current_user)):
    items = await db.wishlists.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    
    # Get product details for each wishlist item
    result = []
    for item in items:
        product = next((p for p in MOCK_PRODUCTS if p["id"] == item["product_id"]), None)
        if product:
            result.append({**item, "product": product})
    
    return result

@api_router.post("/wishlist")
async def add_to_wishlist(item: CreateWishlistItem, current_user: dict = Depends(get_current_user)):
    # Check if already in wishlist
    existing = await db.wishlists.find_one({
        "user_id": current_user["id"],
        "product_id": item.product_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Product already in wishlist")
    
    wishlist_item = WishlistItem(user_id=current_user["id"], product_id=item.product_id)
    await db.wishlists.insert_one(wishlist_item.model_dump())
    
    return {"message": "Added to wishlist", "id": wishlist_item.id}

@api_router.delete("/wishlist/{product_id}")
async def remove_from_wishlist(product_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.wishlists.delete_one({
        "user_id": current_user["id"],
        "product_id": product_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found in wishlist")
    return {"message": "Removed from wishlist"}

# ============ PRICE ALERTS ROUTES ============

@api_router.get("/alerts")
async def get_alerts(current_user: dict = Depends(get_current_user)):
    alerts = await db.alerts.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    
    result = []
    for alert in alerts:
        product = next((p for p in MOCK_PRODUCTS if p["id"] == alert["product_id"]), None)
        if product:
            result.append({**alert, "product": product})
    
    return result

@api_router.post("/alerts")
async def create_alert(alert_data: CreatePriceAlert, current_user: dict = Depends(get_current_user)):
    alert = PriceAlert(
        user_id=current_user["id"],
        product_id=alert_data.product_id,
        target_price=alert_data.target_price
    )
    await db.alerts.insert_one(alert.model_dump())
    return {"message": "Alert created", "id": alert.id}

@api_router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.alerts.delete_one({
        "id": alert_id,
        "user_id": current_user["id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert deleted"}

# ============ SAVED SEARCHES ROUTES ============

@api_router.get("/saved-searches")
async def get_saved_searches(current_user: dict = Depends(get_current_user)):
    searches = await db.saved_searches.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    return searches

@api_router.post("/saved-searches")
async def create_saved_search(search_data: CreateSavedSearch, current_user: dict = Depends(get_current_user)):
    saved_search = SavedSearch(
        user_id=current_user["id"],
        query=search_data.query,
        filters=search_data.filters
    )
    await db.saved_searches.insert_one(saved_search.model_dump())
    return {"message": "Search saved", "id": saved_search.id}

@api_router.delete("/saved-searches/{search_id}")
async def delete_saved_search(search_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.saved_searches.delete_one({
        "id": search_id,
        "user_id": current_user["id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saved search not found")
    return {"message": "Saved search deleted"}

# ============ ADMIN: USER MANAGEMENT ============

@api_router.get("/admin/users")
async def get_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    admin_user: dict = Depends(get_admin_user)
):
    """Get all users with pagination and filtering"""
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    if role:
        query["role"] = role
    
    total = await db.users.count_documents(query)
    skip = (page - 1) * limit
    
    users_cursor = db.users.find(query, {"_id": 0, "password": 0}).skip(skip).limit(limit).sort("created_at", -1)
    users = await users_cursor.to_list(limit)
    
    # Add orders count for each user
    for user in users:
        orders_count = await db.orders.count_documents({"user_id": user.get("id")})
        user["orders_count"] = orders_count
        user["role"] = user.get("role", "user")
    
    return {
        "users": users,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.get("/admin/users/{user_id}")
async def get_user_by_id(user_id: str, admin_user: dict = Depends(get_admin_user)):
    """Get a specific user by ID"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    orders_count = await db.orders.count_documents({"user_id": user_id})
    user["orders_count"] = orders_count
    user["role"] = user.get("role", "user")
    return user

@api_router.post("/admin/users")
async def create_user_admin(user_data: AdminUserCreate, admin_user: dict = Depends(get_admin_user)):
    """Create a new user (admin)"""
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "role": user_data.role,
        "created_at": created_at
    }
    
    await db.users.insert_one(user_doc)
    
    return {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "role": user_data.role,
        "created_at": created_at,
        "orders_count": 0
    }

@api_router.put("/admin/users/{user_id}")
async def update_user_admin(user_id: str, user_data: AdminUserUpdate, admin_user: dict = Depends(get_admin_user)):
    """Update a user (admin)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    if user_data.email is not None:
        # Check if email is taken by another user
        existing = await db.users.find_one({"email": user_data.email, "id": {"$ne": user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_data["email"] = user_data.email
    if user_data.name is not None:
        update_data["name"] = user_data.name
    if user_data.role is not None:
        update_data["role"] = user_data.role
    if user_data.password is not None:
        update_data["password"] = hash_password(user_data.password)
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    orders_count = await db.orders.count_documents({"user_id": user_id})
    updated_user["orders_count"] = orders_count
    updated_user["role"] = updated_user.get("role", "user")
    return updated_user

@api_router.delete("/admin/users/{user_id}")
async def delete_user_admin(user_id: str, admin_user: dict = Depends(get_admin_user)):
    """Delete a user (admin)"""
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Also delete related data
    await db.wishlists.delete_many({"user_id": user_id})
    await db.alerts.delete_many({"user_id": user_id})
    await db.saved_searches.delete_many({"user_id": user_id})
    
    return {"message": "User deleted successfully"}

# ============ ADMIN: ORDER MANAGEMENT ============

@api_router.get("/admin/orders")
async def get_all_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    admin_user: dict = Depends(get_admin_user)
):
    """Get all orders with pagination and filtering"""
    query = {}
    if status:
        query["status"] = status
    if user_id:
        query["user_id"] = user_id
    if search:
        query["$or"] = [
            {"id": {"$regex": search, "$options": "i"}},
            {"user_email": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.orders.count_documents(query)
    skip = (page - 1) * limit
    
    orders_cursor = db.orders.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1)
    orders = await orders_cursor.to_list(limit)
    
    # Enrich with user info
    for order in orders:
        user = await db.users.find_one({"id": order.get("user_id")}, {"_id": 0, "name": 1, "email": 1})
        if user:
            order["user_name"] = user.get("name")
            order["user_email"] = user.get("email")
    
    return {
        "orders": orders,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.get("/admin/orders/{order_id}")
async def get_order_by_id(order_id: str, admin_user: dict = Depends(get_admin_user)):
    """Get a specific order by ID"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    user = await db.users.find_one({"id": order.get("user_id")}, {"_id": 0, "name": 1, "email": 1})
    if user:
        order["user_name"] = user.get("name")
        order["user_email"] = user.get("email")
    
    # Get shipments for this order
    shipments = await db.shipments.find({"order_id": order_id}, {"_id": 0}).to_list(100)
    order["shipments"] = shipments
    
    return order

@api_router.post("/admin/orders")
async def create_order(order_data: OrderCreate, admin_user: dict = Depends(get_admin_user)):
    """Create a new order"""
    # Verify user exists
    user = await db.users.find_one({"id": order_data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    order_id = str(uuid.uuid4())[:8].upper()
    now = datetime.now(timezone.utc).isoformat()
    
    total_amount = sum(item.price * item.quantity for item in order_data.items)
    
    order_doc = {
        "id": order_id,
        "user_id": order_data.user_id,
        "items": [item.model_dump() for item in order_data.items],
        "total_amount": round(total_amount, 2),
        "status": "pending",
        "shipping_address": order_data.shipping_address,
        "billing_address": order_data.billing_address,
        "payment_method": order_data.payment_method,
        "notes": order_data.notes,
        "created_at": now,
        "updated_at": now
    }
    
    await db.orders.insert_one(order_doc)
    
    # Remove MongoDB _id field and add user info
    response_doc = {k: v for k, v in order_doc.items() if k != "_id"}
    response_doc["user_name"] = user.get("name")
    response_doc["user_email"] = user.get("email")
    
    return response_doc

@api_router.put("/admin/orders/{order_id}")
async def update_order(order_id: str, order_data: OrderUpdate, admin_user: dict = Depends(get_admin_user)):
    """Update an order"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if order_data.status is not None:
        if order_data.status not in ORDER_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {ORDER_STATUSES}")
        update_data["status"] = order_data.status
    if order_data.shipping_address is not None:
        update_data["shipping_address"] = order_data.shipping_address
    if order_data.billing_address is not None:
        update_data["billing_address"] = order_data.billing_address
    if order_data.notes is not None:
        update_data["notes"] = order_data.notes
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    user = await db.users.find_one({"id": updated_order.get("user_id")}, {"_id": 0, "name": 1, "email": 1})
    if user:
        updated_order["user_name"] = user.get("name")
        updated_order["user_email"] = user.get("email")
    
    return updated_order

@api_router.delete("/admin/orders/{order_id}")
async def delete_order(order_id: str, admin_user: dict = Depends(get_admin_user)):
    """Delete an order"""
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Also delete related shipments
    await db.shipments.delete_many({"order_id": order_id})
    
    return {"message": "Order deleted successfully"}

# ============ ADMIN: SHIPMENT MANAGEMENT ============

@api_router.get("/admin/shipments")
async def get_all_shipments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    carrier: Optional[str] = Query(None),
    order_id: Optional[str] = Query(None),
    admin_user: dict = Depends(get_admin_user)
):
    """Get all shipments with pagination and filtering"""
    query = {}
    if status:
        query["status"] = status
    if carrier:
        query["carrier"] = carrier
    if order_id:
        query["order_id"] = order_id
    
    total = await db.shipments.count_documents(query)
    skip = (page - 1) * limit
    
    shipments_cursor = db.shipments.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1)
    shipments = await shipments_cursor.to_list(limit)
    
    # Enrich with order info
    for shipment in shipments:
        order = await db.orders.find_one({"id": shipment.get("order_id")}, {"_id": 0, "user_id": 1, "status": 1})
        if order:
            shipment["order_status"] = order.get("status")
            user = await db.users.find_one({"id": order.get("user_id")}, {"_id": 0, "name": 1, "email": 1})
            if user:
                shipment["user_name"] = user.get("name")
                shipment["user_email"] = user.get("email")
    
    return {
        "shipments": shipments,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.get("/admin/shipments/{shipment_id}")
async def get_shipment_by_id(shipment_id: str, admin_user: dict = Depends(get_admin_user)):
    """Get a specific shipment by ID"""
    shipment = await db.shipments.find_one({"id": shipment_id}, {"_id": 0})
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    order = await db.orders.find_one({"id": shipment.get("order_id")}, {"_id": 0})
    if order:
        shipment["order"] = order
    
    return shipment

@api_router.post("/admin/shipments")
async def create_shipment(shipment_data: ShipmentCreate, admin_user: dict = Depends(get_admin_user)):
    """Create a new shipment"""
    # Verify order exists
    order = await db.orders.find_one({"id": shipment_data.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if shipment_data.carrier not in CARRIERS:
        raise HTTPException(status_code=400, detail=f"Invalid carrier. Must be one of: {CARRIERS}")
    
    if shipment_data.shipping_method not in SHIPPING_METHODS:
        raise HTTPException(status_code=400, detail=f"Invalid shipping method. Must be one of: {SHIPPING_METHODS}")
    
    shipment_id = str(uuid.uuid4())[:8].upper()
    now = datetime.now(timezone.utc).isoformat()
    
    shipment_doc = {
        "id": shipment_id,
        "order_id": shipment_data.order_id,
        "carrier": shipment_data.carrier,
        "tracking_number": shipment_data.tracking_number,
        "status": "pending",
        "shipping_method": shipment_data.shipping_method,
        "estimated_delivery": shipment_data.estimated_delivery,
        "actual_delivery": None,
        "notes": shipment_data.notes,
        "created_at": now,
        "updated_at": now
    }
    
    await db.shipments.insert_one(shipment_doc)
    
    # Update order status to shipped if it's currently processing
    if order.get("status") == "processing":
        await db.orders.update_one(
            {"id": shipment_data.order_id},
            {"$set": {"status": "shipped", "updated_at": now}}
        )
    
    # Remove MongoDB _id field before returning
    response_doc = {k: v for k, v in shipment_doc.items() if k != "_id"}
    return response_doc

@api_router.put("/admin/shipments/{shipment_id}")
async def update_shipment(shipment_id: str, shipment_data: ShipmentUpdate, admin_user: dict = Depends(get_admin_user)):
    """Update a shipment"""
    shipment = await db.shipments.find_one({"id": shipment_id})
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if shipment_data.status is not None:
        if shipment_data.status not in SHIPMENT_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {SHIPMENT_STATUSES}")
        update_data["status"] = shipment_data.status
        
        # Update order status based on shipment status
        if shipment_data.status == "delivered":
            await db.orders.update_one(
                {"id": shipment.get("order_id")},
                {"$set": {"status": "delivered", "updated_at": update_data["updated_at"]}}
            )
    
    if shipment_data.carrier is not None:
        if shipment_data.carrier not in CARRIERS:
            raise HTTPException(status_code=400, detail=f"Invalid carrier. Must be one of: {CARRIERS}")
        update_data["carrier"] = shipment_data.carrier
    
    if shipment_data.tracking_number is not None:
        update_data["tracking_number"] = shipment_data.tracking_number
    if shipment_data.shipping_method is not None:
        if shipment_data.shipping_method not in SHIPPING_METHODS:
            raise HTTPException(status_code=400, detail=f"Invalid shipping method. Must be one of: {SHIPPING_METHODS}")
        update_data["shipping_method"] = shipment_data.shipping_method
    if shipment_data.estimated_delivery is not None:
        update_data["estimated_delivery"] = shipment_data.estimated_delivery
    if shipment_data.actual_delivery is not None:
        update_data["actual_delivery"] = shipment_data.actual_delivery
    if shipment_data.notes is not None:
        update_data["notes"] = shipment_data.notes
    
    await db.shipments.update_one({"id": shipment_id}, {"$set": update_data})
    
    return await db.shipments.find_one({"id": shipment_id}, {"_id": 0})

@api_router.delete("/admin/shipments/{shipment_id}")
async def delete_shipment(shipment_id: str, admin_user: dict = Depends(get_admin_user)):
    """Delete a shipment"""
    result = await db.shipments.delete_one({"id": shipment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    return {"message": "Shipment deleted successfully"}

# ============ ADMIN: STATS & LOOKUPS ============

@api_router.get("/admin/stats")
async def get_admin_stats(admin_user: dict = Depends(get_admin_user)):
    """Get admin dashboard statistics"""
    total_users = await db.users.count_documents({})
    total_orders = await db.orders.count_documents({})
    total_shipments = await db.shipments.count_documents({})
    
    # Orders by status
    orders_by_status = {}
    for status in ORDER_STATUSES:
        count = await db.orders.count_documents({"status": status})
        orders_by_status[status] = count
    
    # Shipments by status
    shipments_by_status = {}
    for status in SHIPMENT_STATUSES:
        count = await db.shipments.count_documents({"status": status})
        shipments_by_status[status] = count
    
    # Total revenue
    pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Recent orders
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_users": total_users,
        "total_orders": total_orders,
        "total_shipments": total_shipments,
        "total_revenue": round(total_revenue, 2),
        "orders_by_status": orders_by_status,
        "shipments_by_status": shipments_by_status,
        "recent_orders": recent_orders
    }

@api_router.get("/admin/lookups")
async def get_admin_lookups(admin_user: dict = Depends(get_admin_user)):
    """Get lookup values for dropdowns"""
    return {
        "order_statuses": ORDER_STATUSES,
        "shipment_statuses": SHIPMENT_STATUSES,
        "carriers": CARRIERS,
        "shipping_methods": SHIPPING_METHODS,
        "user_roles": ["user", "admin"]
    }

# ============ COMPARISON ROUTES ============

@api_router.post("/compare")
async def compare_products(product_ids: List[str]):
    if len(product_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 products required for comparison")
    if len(product_ids) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 products can be compared")
    
    products = [p for p in MOCK_PRODUCTS if p["id"] in product_ids]
    if len(products) != len(product_ids):
        raise HTTPException(status_code=404, detail="One or more products not found")
    
    return products

# ============ HEALTH CHECK ============

@api_router.get("/")
async def root():
    return {"message": "PriceWise API is running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router and add middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
