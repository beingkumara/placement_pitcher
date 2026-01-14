import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

# We need a valid token for a CORE user to use the admin endpoint.
# Since we don't have an easy way to login via script without knowing the password (which is hashed),
# we can rely on the fact that if the server started up and logged "SMTP connection verification successful", 
# the underlying issue (credentials) is working locally.
# However, to test the ENDPOINT, we need auth.

# Alternative: We can temporarily cheat or just rely on the logging we added?
# Let's try to login as the admin user we saw seeded: admin@example.com / admin123
# The seed logic in main.py creates this user if it doesn't exist.

BASE_URL = "http://localhost:8000"

def login():
    try:
        response = requests.post(
            f"{BASE_URL}/token",
            data={"username": "admin@example.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        else:
            print(f"Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"Login connection failed: {e}")
        return None

def test_admin_email(token):
    target_email = os.getenv("SMTP_EMAIL") # Send to self
    print(f"Testing admin email endpoint to {target_email}...")
    
    response = requests.post(
        f"{BASE_URL}/api/admin/test-email",
        params={"target_email": target_email},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

if __name__ == "__main__":
    print("Verifying email fix...")
    token = login()
    if token:
        test_admin_email(token)
    else:
        print("Skipping endpoint test due to login failure (server might not be running or admin password changed).")
        print("Please check server logs for 'Startup SMTP Check' messages.")
