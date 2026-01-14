from database import SessionLocal
from models_db import User, UserRole
from auth import get_password_hash

def seed():
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == "admin@example.com").first():
            print("Seeding admin user...")
            pwd = get_password_hash("admin123")
            user = User(email="admin@example.com", password_hash=pwd, role="core", name="Admin Core")
            db.add(user)
            db.commit()
            print("Done.")
        else:
            print("Admin user already exists.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
