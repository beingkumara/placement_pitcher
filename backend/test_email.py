from dotenv import load_dotenv
import os
import sys

# Add current directory to path so we can import services
sys.path.append(os.getcwd())

load_dotenv()

from services.email_service import send_email_smtp

sender = os.getenv("SMTP_EMAIL")
password = os.getenv("SMTP_PASSWORD")

print(f"Testing email sending from {sender}")
if not sender or not password:
    print("Error: Credentials missing in .env")
    exit(1)

try:
    # Send to self for testing
    send_email_smtp(sender, "Test Subject", "Test Body - please ignore")
    print("Test successful!")
except Exception as e:
    print(f"Test failed with error: {e}")
