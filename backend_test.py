import requests
import sys
import json
from datetime import datetime

class AmazonAPITester:
    def __init__(self, base_url="https://amzn-api-finder.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.user_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n=== HEALTH CHECK TESTS ===")
        self.run_test("API Root", "GET", "", 200)
        self.run_test("Health Check", "GET", "health", 200)

    def test_categories(self):
        """Test categories endpoint"""
        print("\n=== CATEGORIES TESTS ===")
        success, response = self.run_test("Get Categories", "GET", "categories", 200)
        if success and response:
            print(f"   Found {len(response)} categories")
            if len(response) > 0:
                print(f"   Sample category: {response[0]}")
        return success

    def test_products(self):
        """Test products endpoints"""
        print("\n=== PRODUCTS TESTS ===")
        
        # Test basic products endpoint
        success, response = self.run_test("Get All Products", "GET", "products", 200)
        if success and response:
            print(f"   Found {response.get('total', 0)} total products")
            print(f"   Returned {len(response.get('products', []))} products")
        
        # Test with query parameter
        self.run_test("Search Products - Sony", "GET", "products?query=Sony", 200)
        
        # Test with category filter
        self.run_test("Filter by Electronics", "GET", "products?category=electronics", 200)
        
        # Test with price filter
        self.run_test("Price Filter", "GET", "products?min_price=100&max_price=500", 200)
        
        # Test with rating filter
        self.run_test("Rating Filter", "GET", "products?min_rating=4.5", 200)
        
        # Test sorting
        self.run_test("Sort by Price Low", "GET", "products?sort_by=price_low", 200)
        self.run_test("Sort by Rating", "GET", "products?sort_by=rating", 200)
        
        # Test pagination
        self.run_test("Pagination", "GET", "products?page=1&limit=5", 200)
        
        # Test specific product
        success, _ = self.run_test("Get Specific Product", "GET", "products/prod-001", 200)
        
        # Test non-existent product
        self.run_test("Non-existent Product", "GET", "products/invalid-id", 404)
        
        return success

    def test_auth_registration(self):
        """Test user registration"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # Generate unique test user
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if success and response:
            self.token = response.get('token')
            self.user_id = response.get('user', {}).get('id')
            print(f"   Registered user: {response.get('user', {}).get('email')}")
            print(f"   Token received: {bool(self.token)}")
        
        # Test duplicate registration
        self.run_test(
            "Duplicate Registration",
            "POST", 
            "auth/register",
            400,
            data=test_user
        )
        
        return success

    def test_auth_login(self):
        """Test user login"""
        if not self.user_id:
            print("⚠️  Skipping login test - no registered user")
            return False
            
        # Test login with correct credentials
        timestamp = datetime.now().strftime('%H%M%S')
        login_data = {
            "email": f"test{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and response:
            self.token = response.get('token')
            print(f"   Login successful for: {response.get('user', {}).get('email')}")
        
        # Test invalid credentials
        self.run_test(
            "Invalid Login",
            "POST",
            "auth/login", 
            401,
            data={"email": "invalid@test.com", "password": "wrong"}
        )
        
        # Test get current user
        if self.token:
            self.run_test("Get Current User", "GET", "auth/me", 200)
        
        return success

    def test_wishlist(self):
        """Test wishlist functionality"""
        if not self.token:
            print("⚠️  Skipping wishlist tests - no authentication token")
            return False
            
        print("\n=== WISHLIST TESTS ===")
        
        # Get empty wishlist
        self.run_test("Get Empty Wishlist", "GET", "wishlist", 200)
        
        # Add item to wishlist
        success, _ = self.run_test(
            "Add to Wishlist",
            "POST",
            "wishlist",
            200,
            data={"product_id": "prod-001"}
        )
        
        # Try to add same item again
        self.run_test(
            "Add Duplicate to Wishlist",
            "POST",
            "wishlist",
            400,
            data={"product_id": "prod-001"}
        )
        
        # Get wishlist with items
        self.run_test("Get Wishlist with Items", "GET", "wishlist", 200)
        
        # Remove from wishlist
        self.run_test("Remove from Wishlist", "DELETE", "wishlist/prod-001", 200)
        
        # Try to remove non-existent item
        self.run_test("Remove Non-existent Item", "DELETE", "wishlist/invalid-id", 404)
        
        return success

    def test_price_alerts(self):
        """Test price alerts functionality"""
        if not self.token:
            print("⚠️  Skipping price alerts tests - no authentication token")
            return False
            
        print("\n=== PRICE ALERTS TESTS ===")
        
        # Get empty alerts
        self.run_test("Get Empty Alerts", "GET", "alerts", 200)
        
        # Create price alert
        success, response = self.run_test(
            "Create Price Alert",
            "POST",
            "alerts",
            200,
            data={"product_id": "prod-001", "target_price": 300.00}
        )
        
        alert_id = None
        if success and response:
            alert_id = response.get('id')
        
        # Get alerts with items
        self.run_test("Get Alerts with Items", "GET", "alerts", 200)
        
        # Delete alert
        if alert_id:
            self.run_test("Delete Alert", "DELETE", f"alerts/{alert_id}", 200)
        
        return success

    def test_saved_searches(self):
        """Test saved searches functionality"""
        if not self.token:
            print("⚠️  Skipping saved searches tests - no authentication token")
            return False
            
        print("\n=== SAVED SEARCHES TESTS ===")
        
        # Get empty saved searches
        self.run_test("Get Empty Saved Searches", "GET", "saved-searches", 200)
        
        # Create saved search
        success, response = self.run_test(
            "Create Saved Search",
            "POST",
            "saved-searches",
            200,
            data={
                "query": "Sony Headphones",
                "filters": {"category": "electronics", "min_rating": "4.5"}
            }
        )
        
        search_id = None
        if success and response:
            search_id = response.get('id')
        
        # Get saved searches with items
        self.run_test("Get Saved Searches with Items", "GET", "saved-searches", 200)
        
        # Delete saved search
        if search_id:
            self.run_test("Delete Saved Search", "DELETE", f"saved-searches/{search_id}", 200)
        
        return success

    def test_comparison(self):
        """Test product comparison functionality"""
        print("\n=== COMPARISON TESTS ===")
        
        # Test valid comparison
        success, _ = self.run_test(
            "Compare Products",
            "POST",
            "compare",
            200,
            data=["prod-001", "prod-002"]
        )
        
        # Test with too few products
        self.run_test(
            "Compare Too Few Products",
            "POST",
            "compare",
            400,
            data=["prod-001"]
        )
        
        # Test with too many products
        self.run_test(
            "Compare Too Many Products",
            "POST",
            "compare",
            400,
            data=["prod-001", "prod-002", "prod-003", "prod-004", "prod-005"]
        )
        
        # Test with invalid product IDs
        self.run_test(
            "Compare Invalid Products",
            "POST",
            "compare",
            404,
            data=["invalid-1", "invalid-2"]
        )
        
        return success

    def test_admin_stats_and_lookups(self):
        """Test admin stats and lookups endpoints"""
        print("\n=== ADMIN STATS & LOOKUPS TESTS ===")
        
        # Test admin stats
        success, response = self.run_test("Get Admin Stats", "GET", "admin/stats", 200)
        if success and response:
            print(f"   Total users: {response.get('total_users', 0)}")
            print(f"   Total orders: {response.get('total_orders', 0)}")
            print(f"   Total shipments: {response.get('total_shipments', 0)}")
            print(f"   Total revenue: ${response.get('total_revenue', 0)}")
        
        # Test admin lookups
        success2, response = self.run_test("Get Admin Lookups", "GET", "admin/lookups", 200)
        if success2 and response:
            print(f"   Order statuses: {len(response.get('order_statuses', []))}")
            print(f"   Shipment statuses: {len(response.get('shipment_statuses', []))}")
            print(f"   Carriers: {len(response.get('carriers', []))}")
        
        return success and success2

    def test_admin_users(self):
        """Test admin user management"""
        print("\n=== ADMIN USERS TESTS ===")
        
        # Get all users
        success, response = self.run_test("Get All Users", "GET", "admin/users", 200)
        if success and response:
            print(f"   Found {response.get('total', 0)} total users")
            print(f"   Returned {len(response.get('users', []))} users")
        
        # Test pagination
        self.run_test("Users Pagination", "GET", "admin/users?page=1&limit=5", 200)
        
        # Test search
        self.run_test("Search Users", "GET", "admin/users?search=test", 200)
        
        # Test role filter
        self.run_test("Filter Users by Role", "GET", "admin/users?role=user", 200)
        
        # Create a test user
        timestamp = datetime.now().strftime('%H%M%S')
        test_admin_user = {
            "name": f"Admin Test User {timestamp}",
            "email": f"admin{timestamp}@example.com",
            "password": "AdminPass123!",
            "role": "admin"
        }
        
        success2, response = self.run_test(
            "Create Admin User",
            "POST",
            "admin/users",
            200,
            data=test_admin_user
        )
        
        created_user_id = None
        if success2 and response:
            created_user_id = response.get('id')
            print(f"   Created user ID: {created_user_id}")
        
        # Get specific user
        if created_user_id:
            self.run_test("Get User by ID", "GET", f"admin/users/{created_user_id}", 200)
            
            # Update user
            update_data = {"name": f"Updated Admin User {timestamp}", "role": "user"}
            self.run_test(
                "Update User",
                "PUT",
                f"admin/users/{created_user_id}",
                200,
                data=update_data
            )
            
            # Delete user
            self.run_test("Delete User", "DELETE", f"admin/users/{created_user_id}", 200)
        
        # Test invalid operations
        self.run_test("Get Non-existent User", "GET", "admin/users/invalid-id", 404)
        self.run_test("Update Non-existent User", "PUT", "admin/users/invalid-id", 404, data={"name": "Test"})
        self.run_test("Delete Non-existent User", "DELETE", "admin/users/invalid-id", 404)
        
        return success and success2

    def test_admin_orders(self):
        """Test admin order management"""
        print("\n=== ADMIN ORDERS TESTS ===")
        
        # Get all orders
        success, response = self.run_test("Get All Orders", "GET", "admin/orders", 200)
        if success and response:
            print(f"   Found {response.get('total', 0)} total orders")
            print(f"   Returned {len(response.get('orders', []))} orders")
        
        # Test pagination and filters
        self.run_test("Orders Pagination", "GET", "admin/orders?page=1&limit=5", 200)
        self.run_test("Filter Orders by Status", "GET", "admin/orders?status=pending", 200)
        
        # Create a test user first for order creation
        if not self.user_id:
            print("   Creating test user for order tests...")
            timestamp = datetime.now().strftime('%H%M%S')
            test_user = {
                "name": f"Order Test User {timestamp}",
                "email": f"orderuser{timestamp}@example.com",
                "password": "OrderPass123!",
                "role": "user"
            }
            
            user_success, user_response = self.run_test(
                "Create User for Orders",
                "POST",
                "admin/users",
                200,
                data=test_user
            )
            
            if user_success and user_response:
                test_user_id = user_response.get('id')
            else:
                print("   Failed to create test user, skipping order creation tests")
                return success
        else:
            test_user_id = self.user_id
        
        # Create a test order
        test_order = {
            "user_id": test_user_id,
            "items": [
                {
                    "product_id": "prod-001",
                    "product_title": "Sony WH-1000XM5 Headphones",
                    "quantity": 1,
                    "price": 348.00
                }
            ],
            "shipping_address": "123 Test St, Test City, TC 12345",
            "billing_address": "123 Test St, Test City, TC 12345",
            "payment_method": "credit_card",
            "notes": "Test order"
        }
        
        success2, response = self.run_test(
            "Create Order",
            "POST",
            "admin/orders",
            200,
            data=test_order
        )
        
        created_order_id = None
        if success2 and response:
            created_order_id = response.get('id')
            print(f"   Created order ID: {created_order_id}")
        
        # Get specific order
        if created_order_id:
            self.run_test("Get Order by ID", "GET", f"admin/orders/{created_order_id}", 200)
            
            # Update order
            update_data = {
                "status": "confirmed",
                "notes": "Updated test order"
            }
            self.run_test(
                "Update Order",
                "PUT",
                f"admin/orders/{created_order_id}",
                200,
                data=update_data
            )
            
            # Delete order
            self.run_test("Delete Order", "DELETE", f"admin/orders/{created_order_id}", 200)
        
        # Test invalid operations
        self.run_test("Get Non-existent Order", "GET", "admin/orders/invalid-id", 404)
        self.run_test("Update Non-existent Order", "PUT", "admin/orders/invalid-id", 404, data={"status": "confirmed"})
        self.run_test("Delete Non-existent Order", "DELETE", "admin/orders/invalid-id", 404)
        
        return success and success2

    def test_admin_shipments(self):
        """Test admin shipment management"""
        print("\n=== ADMIN SHIPMENTS TESTS ===")
        
        # Get all shipments
        success, response = self.run_test("Get All Shipments", "GET", "admin/shipments", 200)
        if success and response:
            print(f"   Found {response.get('total', 0)} total shipments")
            print(f"   Returned {len(response.get('shipments', []))} shipments")
        
        # Test pagination and filters
        self.run_test("Shipments Pagination", "GET", "admin/shipments?page=1&limit=5", 200)
        self.run_test("Filter Shipments by Status", "GET", "admin/shipments?status=pending", 200)
        self.run_test("Filter Shipments by Carrier", "GET", "admin/shipments?carrier=UPS", 200)
        
        # Create a test order first for shipment creation
        timestamp = datetime.now().strftime('%H%M%S')
        
        # Create user for order
        test_user = {
            "name": f"Shipment Test User {timestamp}",
            "email": f"shipuser{timestamp}@example.com",
            "password": "ShipPass123!",
            "role": "user"
        }
        
        user_success, user_response = self.run_test(
            "Create User for Shipments",
            "POST",
            "admin/users",
            200,
            data=test_user
        )
        
        if not user_success or not user_response:
            print("   Failed to create test user, skipping shipment creation tests")
            return success
        
        test_user_id = user_response.get('id')
        
        # Create order for shipment
        test_order = {
            "user_id": test_user_id,
            "items": [
                {
                    "product_id": "prod-002",
                    "product_title": "Apple AirPods Pro",
                    "quantity": 1,
                    "price": 189.99
                }
            ],
            "shipping_address": "456 Ship St, Ship City, SC 67890",
            "billing_address": "456 Ship St, Ship City, SC 67890",
            "payment_method": "credit_card"
        }
        
        order_success, order_response = self.run_test(
            "Create Order for Shipment",
            "POST",
            "admin/orders",
            200,
            data=test_order
        )
        
        if not order_success or not order_response:
            print("   Failed to create test order, skipping shipment creation tests")
            return success
        
        test_order_id = order_response.get('id')
        
        # Create a test shipment
        test_shipment = {
            "order_id": test_order_id,
            "carrier": "UPS",
            "tracking_number": f"1Z999AA{timestamp}",
            "shipping_method": "standard",
            "estimated_delivery": "2024-12-31",
            "notes": "Test shipment"
        }
        
        success2, response = self.run_test(
            "Create Shipment",
            "POST",
            "admin/shipments",
            200,
            data=test_shipment
        )
        
        created_shipment_id = None
        if success2 and response:
            created_shipment_id = response.get('id')
            print(f"   Created shipment ID: {created_shipment_id}")
        
        # Get specific shipment
        if created_shipment_id:
            self.run_test("Get Shipment by ID", "GET", f"admin/shipments/{created_shipment_id}", 200)
            
            # Update shipment
            update_data = {
                "status": "in_transit",
                "notes": "Updated test shipment"
            }
            self.run_test(
                "Update Shipment",
                "PUT",
                f"admin/shipments/{created_shipment_id}",
                200,
                data=update_data
            )
            
            # Delete shipment
            self.run_test("Delete Shipment", "DELETE", f"admin/shipments/{created_shipment_id}", 200)
        
        # Clean up test order and user
        if test_order_id:
            self.run_test("Cleanup Test Order", "DELETE", f"admin/orders/{test_order_id}", 200)
        if test_user_id:
            self.run_test("Cleanup Test User", "DELETE", f"admin/users/{test_user_id}", 200)
        
        # Test invalid operations
        self.run_test("Get Non-existent Shipment", "GET", "admin/shipments/invalid-id", 404)
        self.run_test("Update Non-existent Shipment", "PUT", "admin/shipments/invalid-id", 404, data={"status": "delivered"})
        self.run_test("Delete Non-existent Shipment", "DELETE", "admin/shipments/invalid-id", 404)
        
        return success and success2

def main():
    print("🚀 Starting PriceWise Admin Panel Backend Tests")
    print("=" * 50)
    
    tester = AmazonAPITester()
    
    # Run all test suites
    tester.test_health_check()
    tester.test_categories()
    tester.test_products()
    tester.test_auth_registration()
    tester.test_auth_login()
    tester.test_wishlist()
    tester.test_price_alerts()
    tester.test_saved_searches()
    tester.test_comparison()
    
    # Run admin-specific tests
    tester.test_admin_stats_and_lookups()
    tester.test_admin_users()
    tester.test_admin_orders()
    tester.test_admin_shipments()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ FAILED TESTS:")
        for test in tester.failed_tests:
            error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
            print(f"   - {test['test']}: {error_msg} ({test['endpoint']})")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())