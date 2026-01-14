
import urllib.request
import urllib.parse
import json
import os
import sys

# Load env vars manually if needed, or rely on execution context
# verification: check if server is running on localhost:8000
BASE_URL = "http://localhost:8000"
SECRET = "manage_core_secret"

def make_request(endpoint, data=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {'Content-Type': 'application/json'}
    
    if data:
        data_json = json.dumps(data).encode('utf-8')
        req = urllib.request.Request(url, data=data_json, headers=headers, method='POST')
    else:
        req = urllib.request.Request(url, headers=headers)
        
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.request.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        print(f"Request failed: {e}")
        return 500, str(e)

def test_create_core():
    print("Testing creation without secret...")
    status, res = make_request("/api/admin/create-core", {
        "email": "testcore_fail_urllib@example.com",
        "name": "Test Fail",
        "role": "core",
        "admin_secret": "wrong"
    })
    
    if status == 403:
        print("PASS: Access denied as expected.")
    else:
        print(f"FAIL: Unexpected status {status} {res}")

    print("\nTesting creation with correct secret...")
    email = "testcore_success_urllib@example.com"
    status, res = make_request("/api/admin/create-core", {
        "email": email,
        "name": "Test Success",
        "role": "core",
        "admin_secret": SECRET
    })
    
    if status == 200:
        print(f"PASS: User created. ID: {res.get('id')}, Role: {res.get('role')}")
        if res.get('role') == 'core':
            print("PASS: Role is core.")
        else:
            print(f"FAIL: Role is {res.get('role')}")
    elif status == 400 and "Email already registered" in str(res):
         print("PASS: User already exists (idempotent check).")
    else:
        print(f"FAIL: Failed to create user. {status} {res}")

if __name__ == "__main__":
    test_create_core()
