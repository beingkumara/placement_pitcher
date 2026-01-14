from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE sent_emails ADD COLUMN attachment_names VARCHAR"))
            conn.commit()
            print("Successfully added attachment_names column.")
        except Exception as e:
            print(f"Migration failed (column might already exist): {e}")

if __name__ == "__main__":
    migrate()
