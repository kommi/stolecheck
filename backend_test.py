#!/usr/bin/env python3
"""
StoleCheck Backend API Testing Script
Tests all API endpoints for the stolen goods detection platform
"""
import requests
import sys
import json
import time
from datetime import datetime

class StoleCheckAPITester:
    def __init__(self, base_url="https://doc-deploy-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.tokens = {}  # Store tokens for different users
        self.test_results = []
        self.failed_tests = []
        print(f"🔍 Testing StoleCheck API at: {base_url}")
        print("=" * 60)

    def log_test(self, name, success, details="", expected_status=None, actual_status=None):
        """Log test results"""
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "expected_status": expected_status,
            "actual_status": actual_status
        }
        self.test_results.append(result)
        
        status_icon = "✅" if success else "❌"
        status_detail = f" (Expected: {expected_status}, Got: {actual_status})" if expected_status and actual_status else ""
        print(f"{status_icon} {name}{status_detail}")
        if details:
            print(f"    → {details}")
        
        if not success:
            self.failed_tests.append(result)

    def api_request(self, method, endpoint, data=None, user_token=None, expected_status=200):
        """Make API request with error handling"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if user_token:
            headers['Authorization'] = f'Bearer {user_token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers)
            else:
                response = requests.request(method, url, json=data, headers=headers)
            
            return response
        except Exception as e:
            print(f"❌ Request failed: {str(e)}")
            return None

    def test_public_endpoints(self):
        """Test public endpoints that don't require authentication"""
        print("\n📊 Testing Public Endpoints")
        print("-" * 30)
        
        # Root endpoint
        response = self.api_request('GET', '/')
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Root endpoint", True, f"Message: {data.get('message', 'N/A')}", 200, response.status_code)
        else:
            self.log_test("Root endpoint", False, "Failed to get response", 200, response.status_code if response else None)
        
        # Public stats
        response = self.api_request('GET', '/public/stats')
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ['total_items_registered', 'items_recovered', 'total_verifications', 'registered_users']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                self.log_test("Public stats endpoint", True, f"Items: {data['total_items_registered']}, Users: {data['registered_users']}", 200, response.status_code)
            else:
                self.log_test("Public stats endpoint", False, f"Missing fields: {missing_fields}", 200, response.status_code)
        else:
            self.log_test("Public stats endpoint", False, "Failed to get stats", 200, response.status_code if response else None)

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication")
        print("-" * 30)
        
        # Test demo user logins
        demo_users = [
            ("admin@stolecheck.in", "admin123", "admin"),
            ("priya@example.com", "pass123", "victim"),
            ("ravi@example.com", "pass123", "buyer"),
            ("inspector@police.gov.in", "pass123", "law_enforcement")
        ]
        
        for email, password, role in demo_users:
            response = self.api_request('POST', '/auth/login', {
                "email": email,
                "password": password
            })
            
            if response and response.status_code == 200:
                data = response.json()
                if 'token' in data and 'user' in data:
                    self.tokens[role] = data['token']
                    user = data['user']
                    self.log_test(f"Login {role}", True, f"User: {user.get('name', 'N/A')}, Role: {user.get('role', 'N/A')}", 200, response.status_code)
                else:
                    self.log_test(f"Login {role}", False, "Missing token or user in response", 200, response.status_code)
            else:
                self.log_test(f"Login {role}", False, f"Login failed for {email}", 200, response.status_code if response else None)
        
        # Test /auth/me for authenticated users
        if 'admin' in self.tokens:
            response = self.api_request('GET', '/auth/me', user_token=self.tokens['admin'])
            if response and response.status_code == 200:
                user = response.json()
                self.log_test("Auth me endpoint", True, f"Authenticated as: {user.get('name', 'N/A')}", 200, response.status_code)
            else:
                self.log_test("Auth me endpoint", False, "Failed to get current user", 200, response.status_code if response else None)

    def test_victim_endpoints(self):
        """Test victim-specific endpoints"""
        print("\n👤 Testing Victim Endpoints")
        print("-" * 30)
        
        victim_token = self.tokens.get('victim')
        if not victim_token:
            self.log_test("Victim endpoints", False, "No victim token available")
            return
        
        # Get victim's items
        response = self.api_request('GET', '/items', user_token=victim_token)
        if response and response.status_code == 200:
            items = response.json()
            self.log_test("Get victim items", True, f"Found {len(items)} items", 200, response.status_code)
            
            # Test getting specific item if available
            if items and len(items) > 0:
                item_id = items[0]['item_id']
                response = self.api_request('GET', f'/items/{item_id}', user_token=victim_token)
                if response and response.status_code == 200:
                    self.log_test("Get specific item", True, f"Retrieved item: {response.json().get('title', 'N/A')}", 200, response.status_code)
                else:
                    self.log_test("Get specific item", False, "Failed to get item details", 200, response.status_code if response else None)
        else:
            self.log_test("Get victim items", False, "Failed to get items", 200, response.status_code if response else None)
        
        # Test creating a new item
        test_item = {
            "category": "electronics",
            "title": "Test iPhone 15 Pro",
            "description": "Test phone for API testing",
            "brand": "Apple",
            "model": "iPhone 15 Pro",
            "color": "Blue",
            "estimated_value": 120000,
            "unique_identifiers": {"imei": "123456789012345"},
            "theft_date": "2025-12-01",
            "theft_location": "Test City",
            "fir_number": "FIR/2025/TEST/001"
        }
        
        response = self.api_request('POST', '/items', test_item, user_token=victim_token)
        if response and response.status_code == 201:
            created_item = response.json()
            self.log_test("Create stolen item", True, f"Created item with SCID: {created_item.get('scid', 'N/A')}", 201, response.status_code)
            
            # Test updating the item
            update_data = {"status": "recovered"}
            response = self.api_request('PATCH', f'/items/{created_item["item_id"]}', update_data, user_token=victim_token)
            if response and response.status_code == 200:
                self.log_test("Update item status", True, "Item status updated to recovered", 200, response.status_code)
            else:
                self.log_test("Update item status", False, "Failed to update item", 200, response.status_code if response else None)
        else:
            self.log_test("Create stolen item", False, "Failed to create item", 201, response.status_code if response else None)

    def test_buyer_endpoints(self):
        """Test buyer verification endpoints"""
        print("\n🔍 Testing Buyer Verification")
        print("-" * 30)
        
        buyer_token = self.tokens.get('buyer')
        if not buyer_token:
            self.log_test("Buyer endpoints", False, "No buyer token available")
            return
        
        # Test text search
        text_search = {
            "search_type": "text_search",
            "search_text": "iPhone",
            "category": "electronics"
        }
        
        response = self.api_request('POST', '/verify', text_search, user_token=buyer_token)
        if response and response.status_code == 200:
            result = response.json()
            tps_score = result.get('tps_score', 0)
            matched_items = result.get('matched_items', [])
            self.log_test("Text search verification", True, f"TPS Score: {tps_score}, Matches: {len(matched_items)}", 200, response.status_code)
        else:
            self.log_test("Text search verification", False, "Text search failed", 200, response.status_code if response else None)
        
        # Test ID scan with known IMEI from seed data
        id_scan = {
            "search_type": "id_scan",
            "identifier_type": "imei",
            "identifier_value": "354876110987654"  # From seed data
        }
        
        response = self.api_request('POST', '/verify', id_scan, user_token=buyer_token)
        if response and response.status_code == 200:
            result = response.json()
            tps_score = result.get('tps_score', 0)
            self.log_test("ID scan verification", True, f"IMEI scan TPS: {tps_score} (should be high for known stolen IMEI)", 200, response.status_code)
        else:
            self.log_test("ID scan verification", False, "ID scan failed", 200, response.status_code if response else None)
        
        # Test verification history
        response = self.api_request('GET', '/verify/history', user_token=buyer_token)
        if response and response.status_code == 200:
            history = response.json()
            self.log_test("Verification history", True, f"Found {len(history)} verification records", 200, response.status_code)
        else:
            self.log_test("Verification history", False, "Failed to get history", 200, response.status_code if response else None)

    def test_law_enforcement_endpoints(self):
        """Test law enforcement endpoints"""
        print("\n👮 Testing Law Enforcement Endpoints")
        print("-" * 30)
        
        leo_token = self.tokens.get('law_enforcement')
        if not leo_token:
            self.log_test("Law enforcement endpoints", False, "No law enforcement token available")
            return
        
        # Test getting stats
        response = self.api_request('GET', '/law/stats', user_token=leo_token)
        if response and response.status_code == 200:
            stats = response.json()
            required_fields = ['total_alerts', 'new_alerts', 'total_cases', 'open_cases']
            missing_fields = [field for field in required_fields if field not in stats]
            
            if not missing_fields:
                self.log_test("Law enforcement stats", True, f"Alerts: {stats['total_alerts']}, Cases: {stats['total_cases']}", 200, response.status_code)
            else:
                self.log_test("Law enforcement stats", False, f"Missing fields: {missing_fields}", 200, response.status_code)
        else:
            self.log_test("Law enforcement stats", False, "Failed to get law enforcement stats", 200, response.status_code if response else None)
        
        # Test getting alerts
        response = self.api_request('GET', '/law/alerts', user_token=leo_token)
        if response and response.status_code == 200:
            alerts = response.json()
            self.log_test("Get alerts", True, f"Found {len(alerts)} alerts", 200, response.status_code)
            
            # Test updating alert status if alerts exist
            if alerts and len(alerts) > 0:
                alert_id = alerts[0]['alert_id']
                update_data = {"status": "investigating"}
                response = self.api_request('PATCH', f'/law/alerts/{alert_id}', update_data, user_token=leo_token)
                if response and response.status_code == 200:
                    self.log_test("Update alert status", True, "Alert status updated", 200, response.status_code)
                else:
                    self.log_test("Update alert status", False, "Failed to update alert", 200, response.status_code if response else None)
        else:
            self.log_test("Get alerts", False, "Failed to get alerts", 200, response.status_code if response else None)
        
        # Test getting cases
        response = self.api_request('GET', '/law/cases', user_token=leo_token)
        if response and response.status_code == 200:
            cases = response.json()
            self.log_test("Get cases", True, f"Found {len(cases)} cases", 200, response.status_code)
        else:
            self.log_test("Get cases", False, "Failed to get cases", 200, response.status_code if response else None)
        
        # Test getting all items (law enforcement view)
        response = self.api_request('GET', '/law/items', user_token=leo_token)
        if response and response.status_code == 200:
            items = response.json()
            self.log_test("Get all items (law enforcement)", True, f"Found {len(items)} items in database", 200, response.status_code)
        else:
            self.log_test("Get all items (law enforcement)", False, "Failed to get all items", 200, response.status_code if response else None)

    def test_admin_endpoints(self):
        """Test admin endpoints"""
        print("\n⚙️ Testing Admin Endpoints")
        print("-" * 30)
        
        admin_token = self.tokens.get('admin')
        if not admin_token:
            self.log_test("Admin endpoints", False, "No admin token available")
            return
        
        # Test admin stats
        response = self.api_request('GET', '/admin/stats', user_token=admin_token)
        if response and response.status_code == 200:
            stats = response.json()
            required_fields = ['total_users', 'total_items', 'total_verifications', 'users_by_role', 'items_by_category']
            missing_fields = [field for field in required_fields if field not in stats]
            
            if not missing_fields:
                self.log_test("Admin stats", True, f"Users: {stats['total_users']}, Items: {stats['total_items']}", 200, response.status_code)
            else:
                self.log_test("Admin stats", False, f"Missing fields: {missing_fields}", 200, response.status_code)
        else:
            self.log_test("Admin stats", False, "Failed to get admin stats", 200, response.status_code if response else None)
        
        # Test getting all users
        response = self.api_request('GET', '/admin/users', user_token=admin_token)
        if response and response.status_code == 200:
            users = response.json()
            self.log_test("Get all users", True, f"Found {len(users)} users", 200, response.status_code)
            
            # Test role update if users exist
            if users and len(users) > 1:  # Don't modify the first user (might be admin)
                user_id = users[1]['user_id']
                current_role = users[1]['role']
                new_role = 'buyer' if current_role != 'buyer' else 'victim'
                
                response = self.api_request('PATCH', f'/admin/users/{user_id}/role', {"role": new_role}, user_token=admin_token)
                if response and response.status_code == 200:
                    self.log_test("Update user role", True, f"Changed role from {current_role} to {new_role}", 200, response.status_code)
                    
                    # Change it back
                    response = self.api_request('PATCH', f'/admin/users/{user_id}/role', {"role": current_role}, user_token=admin_token)
                else:
                    self.log_test("Update user role", False, "Failed to update user role", 200, response.status_code if response else None)
        else:
            self.log_test("Get all users", False, "Failed to get users", 200, response.status_code if response else None)

    def run_all_tests(self):
        """Run all test suites"""
        start_time = time.time()
        
        # Run test suites
        self.test_public_endpoints()
        self.test_authentication()
        self.test_victim_endpoints()
        self.test_buyer_endpoints()
        self.test_law_enforcement_endpoints()
        self.test_admin_endpoints()
        
        # Print summary
        end_time = time.time()
        duration = round(end_time - start_time, 2)
        
        total_tests = len(self.test_results)
        passed_tests = total_tests - len(self.failed_tests)
        success_rate = round((passed_tests / total_tests) * 100, 1) if total_tests > 0 else 0
        
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {success_rate}%")
        print(f"Duration: {duration}s")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests ({len(self.failed_tests)}):")
            for test in self.failed_tests:
                print(f"  • {test['test_name']}: {test['details']}")
        
        return success_rate >= 80  # Return True if 80% or more tests pass

def main():
    """Main test execution"""
    tester = StoleCheckAPITester()
    success = tester.run_all_tests()
    
    # Save results to file
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_tests": len(tester.test_results),
            "passed_tests": len(tester.test_results) - len(tester.failed_tests),
            "failed_tests": len(tester.failed_tests),
            "success_rate": round(((len(tester.test_results) - len(tester.failed_tests)) / len(tester.test_results)) * 100, 1) if tester.test_results else 0,
            "results": tester.test_results,
            "failed_tests": tester.failed_tests
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())