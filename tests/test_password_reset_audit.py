"""
Test suite for Password Reset and Audit Logs features
Tests: Forgot Password, Reset Password, Token Verification, Audit Logs API
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@pricewise.com"
ADMIN_PASSWORD = "admin123"
TEST_USER_EMAIL = f"test_reset_{int(time.time())}@example.com"
TEST_USER_PASSWORD = "testpass123"
TEST_USER_NAME = "Test Reset User"


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestForgotPassword:
    """Tests for forgot password functionality"""
    
    def test_forgot_password_existing_user(self):
        """Test forgot password for existing user returns token in dev mode"""
        # First register a test user
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        })
        assert register_response.status_code == 200
        
        # Request password reset
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": TEST_USER_EMAIL
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "reset_token" in data  # Dev mode returns token
        assert "reset_url" in data
        assert data["reset_token"] is not None
        assert len(data["reset_token"]) > 20  # Token should be substantial
        print(f"Forgot password success - token received: {data['reset_token'][:20]}...")
    
    def test_forgot_password_nonexistent_user(self):
        """Test forgot password for non-existent user (should not reveal user existence)"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent_user_xyz@example.com"
        })
        assert response.status_code == 200  # Should still return 200 to prevent enumeration
        data = response.json()
        assert "message" in data
        # For non-existent user, reset_token should be None
        print(f"Forgot password for non-existent user - message: {data['message']}")
    
    def test_forgot_password_invalid_email_format(self):
        """Test forgot password with invalid email format"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "invalid-email"
        })
        assert response.status_code == 422  # Validation error


class TestVerifyResetToken:
    """Tests for reset token verification"""
    
    def test_verify_valid_token(self):
        """Test verifying a valid reset token"""
        # First get a reset token
        forgot_response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": TEST_USER_EMAIL
        })
        assert forgot_response.status_code == 200
        token = forgot_response.json().get("reset_token")
        
        if token:
            # Verify the token
            response = requests.get(f"{BASE_URL}/api/auth/verify-reset-token/{token}")
            assert response.status_code == 200
            data = response.json()
            assert data["valid"] == True
            assert data["email"] == TEST_USER_EMAIL
            print(f"Token verification success - email: {data['email']}")
        else:
            pytest.skip("No reset token returned (user may not exist)")
    
    def test_verify_invalid_token(self):
        """Test verifying an invalid reset token"""
        response = requests.get(f"{BASE_URL}/api/auth/verify-reset-token/invalid_token_xyz123")
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"Invalid token correctly rejected: {data['detail']}")


class TestResetPassword:
    """Tests for password reset functionality"""
    
    def test_reset_password_success(self):
        """Test successful password reset flow"""
        # Get a reset token
        forgot_response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": TEST_USER_EMAIL
        })
        assert forgot_response.status_code == 200
        token = forgot_response.json().get("reset_token")
        
        if not token:
            pytest.skip("No reset token returned")
        
        # Reset the password
        new_password = "newpassword123"
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": new_password
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "successfully" in data["message"].lower()
        print(f"Password reset success: {data['message']}")
        
        # Verify can login with new password
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": new_password
        })
        assert login_response.status_code == 200
        print("Login with new password successful")
    
    def test_reset_password_invalid_token(self):
        """Test password reset with invalid token"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid_token_xyz",
            "new_password": "newpassword123"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"Invalid token correctly rejected: {data['detail']}")
    
    def test_reset_password_short_password(self):
        """Test password reset with too short password"""
        # Get a valid token first
        forgot_response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": TEST_USER_EMAIL
        })
        token = forgot_response.json().get("reset_token")
        
        if not token:
            pytest.skip("No reset token returned")
        
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": "123"  # Too short
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"Short password correctly rejected: {data['detail']}")
    
    def test_reset_password_used_token(self):
        """Test that used token cannot be reused"""
        # Get a reset token
        forgot_response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": TEST_USER_EMAIL
        })
        token = forgot_response.json().get("reset_token")
        
        if not token:
            pytest.skip("No reset token returned")
        
        # Use the token
        response1 = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": "firstpassword123"
        })
        assert response1.status_code == 200
        
        # Try to use the same token again
        response2 = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": "secondpassword123"
        })
        assert response2.status_code == 400  # Token should be marked as used
        print("Used token correctly rejected on second use")


class TestAdminAuditLogs:
    """Tests for admin audit logs functionality"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["token"]
    
    def test_get_audit_logs(self, admin_token):
        """Test fetching audit logs"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/audit-logs", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "logs" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert "total_pages" in data
        assert isinstance(data["logs"], list)
        print(f"Audit logs fetched - total: {data['total']}, page: {data['page']}")
    
    def test_get_audit_logs_pagination(self, admin_token):
        """Test audit logs pagination"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/audit-logs?page=1&limit=5", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["logs"]) <= 5
        print(f"Pagination test - returned {len(data['logs'])} logs with limit 5")
    
    def test_get_audit_logs_filter_by_action(self, admin_token):
        """Test filtering audit logs by action"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/audit-logs?action=CREATE", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # All returned logs should have action=CREATE
        for log in data["logs"]:
            assert log["action"] == "CREATE"
        print(f"Action filter test - {len(data['logs'])} CREATE logs found")
    
    def test_get_audit_logs_filter_by_resource(self, admin_token):
        """Test filtering audit logs by resource type"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/audit-logs?resource_type=user", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # All returned logs should have resource_type=user
        for log in data["logs"]:
            assert log["resource_type"] == "user"
        print(f"Resource filter test - {len(data['logs'])} user logs found")
    
    def test_get_audit_log_actions(self, admin_token):
        """Test fetching available audit log actions for filtering"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/audit-logs/actions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "actions" in data
        assert "resource_types" in data
        assert isinstance(data["actions"], list)
        assert isinstance(data["resource_types"], list)
        print(f"Filter options - actions: {data['actions']}, resources: {data['resource_types']}")
    
    def test_audit_logs_unauthorized(self):
        """Test that audit logs require admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/audit-logs")
        assert response.status_code in [401, 403]
        print("Unauthorized access correctly rejected")
    
    def test_audit_logs_non_admin(self):
        """Test that non-admin users cannot access audit logs"""
        # Register a regular user
        test_email = f"regular_user_{int(time.time())}@example.com"
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "name": "Regular User"
        })
        
        if register_response.status_code == 200:
            token = register_response.json()["token"]
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(f"{BASE_URL}/api/admin/audit-logs", headers=headers)
            assert response.status_code == 403  # Forbidden for non-admin
            print("Non-admin access correctly rejected")
        else:
            pytest.skip("Could not create test user")


class TestAuditLogCreation:
    """Tests to verify audit logs are created for admin actions"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["token"]
    
    def test_user_creation_creates_audit_log(self, admin_token):
        """Test that creating a user creates an audit log entry"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current audit log count
        logs_before = requests.get(f"{BASE_URL}/api/admin/audit-logs?action=CREATE&resource_type=user", headers=headers)
        count_before = logs_before.json()["total"]
        
        # Create a user
        test_email = f"audit_test_{int(time.time())}@example.com"
        create_response = requests.post(f"{BASE_URL}/api/admin/users", headers=headers, json={
            "email": test_email,
            "password": "testpass123",
            "name": "Audit Test User",
            "role": "user"
        })
        assert create_response.status_code == 200
        
        # Check audit log count increased
        logs_after = requests.get(f"{BASE_URL}/api/admin/audit-logs?action=CREATE&resource_type=user", headers=headers)
        count_after = logs_after.json()["total"]
        
        assert count_after > count_before
        print(f"Audit log created for user creation - before: {count_before}, after: {count_after}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
