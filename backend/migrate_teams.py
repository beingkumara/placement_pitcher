import os
from sqlalchemy import MetaData
from database import engine, Base, SessionLocal
from models_db import User, Team, UserRole, ContactForDB, EmailReply, SentEmail
from auth import get_password_hash

def migrate_teams():
    print("WARNING: This migration will DELETE ALL EXISTING DATA.")
    
    # 1. Drop all tables
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    # 2. Create all tables (includes new Team table and foreign keys)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    
    # 3. Seed Initial Data
    print("Seeding initial data...")
    db = SessionLocal()
    try:
        # Create Default Team
        default_team = Team(name="Admin Team")
        db.add(default_team)
        db.commit()
        db.refresh(default_team)
        print(f"Created Team: {default_team.name} (ID: {default_team.id})")
        
        # Create Default Admin User
        pwd = get_password_hash("admin123")
        admin_user = User(
            email="admin@example.com", 
            password_hash=pwd, 
            role=UserRole.CORE, 
            name="Admin Core",
            team_id=default_team.id
        )
        db.add(admin_user)
        db.commit()
        print(f"Created Admin User: {admin_user.email} in Team {default_team.id}")
        
    except Exception as e:
        print(f"Error seeding data: {e}")
    finally:
        db.close()
        
    print("Migration and Seed completed successfully.")

if __name__ == "__main__":
    migrate_teams()
