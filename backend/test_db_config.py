
import os
import sys

# Mock the environment variable BEFORE importing the module
os.environ["DATABASE_URL"] = "postgres://user:pass@host/db"

# Add current directory to path so we can import database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    import database
    print(f"Original: postgres://user:pass@host/db")
    print(f"Transformed: {database.DATABASE_URL}")
    
    assert database.DATABASE_URL.startswith("postgresql://"), "Scheme replacement failed"
    assert "sslmode=require" in database.DATABASE_URL, "SSL mode not appended"
    
    print("SUCCESS: Database URL transformation verified.")
except Exception as e:
    print(f"FAILURE: {e}")
    sys.exit(1)
