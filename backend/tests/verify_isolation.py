from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, engine, Base
from models_db import User, Team, UserRole
from auth import create_access_token
# import pytest

# Initialize TestClient
client = TestClient(app)

def get_token(email):
    # Mock token generation for test simplicity or use login endpoint
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    db.close()
    if not user:
        return None
    return create_access_token(data={"sub": user.email, "role": user.role})

def verify_isolation():
    print("Starting Isolation Verification...")
    
    # 1. Login as Default Admin (Core A)
    token_a = get_token("admin@example.com")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    
    # 2. Verify Admin sees only themselves initially
    resp = client.get("/api/users", headers=headers_a)
    assert resp.status_code == 200
    users_a = resp.json()
    print(f"Core A sees {len(users_a)} users.")
    
    # 3. Create Core B (simulating /api/admin/create-core)
    # Since this endpoint requires a secret, let's mock or use direct DB creation for Core B to ensure valid state
    # Actually, let's use the API if possible. Env var might be needed.
    # Alternatively, create manually in DB.
    db = SessionLocal()
    
    # Create Team B
    team_b = Team(name="Team B")
    db.add(team_b)
    db.commit()
    
    # Create Core B User
    core_b = User(
        email="coreB@example.com", 
        name="Core B", 
        role=UserRole.CORE, 
        team_id=team_b.id,
        password_hash="mock_hash"
    )
    db.add(core_b)
    db.commit()
    db.close()
    
    token_b = get_token("coreB@example.com")
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    # 4. Verify Core B sees only Core B
    resp = client.get("/api/users", headers=headers_b)
    assert resp.status_code == 200
    users_b = resp.json()
    print(f"Core B sees {len(users_b)} users. (Should be 1)")
    assert len(users_b) == 1
    assert users_b[0]["email"] == "coreB@example.com"
    
    # 5. Core A should NOT see Core B
    resp = client.get("/api/users", headers=headers_a)
    users_a_after = resp.json()
    print(f"Core A sees {len(users_a_after)} users. (Should still be 1)")
    assert len(users_a_after) == 1
    assert users_a_after[0]["email"] == "admin@example.com"
    
    print("SUCCESS: Core A and Core B are isolated.")

if __name__ == "__main__":
    try:
        verify_isolation()
    except AssertionError as e:
        print(f"FAILED: {e}")
    except Exception as e:
        print(f"ERROR: {e}")
