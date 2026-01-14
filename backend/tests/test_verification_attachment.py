from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from main import app, get_current_user, get_db

# Mock DB and User
def mock_get_current_user():
    user = MagicMock()
    user.id = 1
    user.role = "Core"
    return user

def mock_get_db():
    db = MagicMock()
    contact = MagicMock()
    contact.id = 1
    contact.email = "test@example.com"
    contact.company_name = "TestCompany"
    contact.assigned_to_id = 1
    
    # Setup query return
    db.query.return_value.filter.return_value.first.return_value = contact
    yield db

app.dependency_overrides[get_current_user] = mock_get_current_user
app.dependency_overrides[get_db] = mock_get_db

client = TestClient(app)

@patch('main.send_email_smtp')
def test_send_email_with_attachment(mock_send_email):
    mock_send_email.return_value = True
    
    # Helper to clean up
    test_file_content = b"This is a test PDF content"
    files = [
        ('files', ('test.pdf', test_file_content, 'application/pdf'))
    ]
    data = {
        'subject': 'Test Subject',
        'body': 'Test Body',
        'contact_email': 'test@example.com',
        'contact_company_name': 'TestCompany'
    }
    
    response = client.post("/api/send-email", data=data, files=files)
    
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.json()}")
    
    assert response.status_code == 200
    
    # Verify mock was called with files
    mock_send_email.assert_called_once()
    call_args = mock_send_email.call_args
    # args: (to_email, subject, body), kwargs: files=[...]
    # or (to_email, subject, body, files=...)?
    # send_email_smtp signature: (to_email, subject, body, files=None)
    
    args, kwargs = call_args
    assert args[0] == 'test@example.com'
    assert args[1] == 'Test Subject'
    assert args[2] == 'Test Body'
    
    # Check files in kwargs
    sent_files = kwargs.get('files')
    assert sent_files is not None
    assert len(sent_files) == 1
    filename, content = sent_files[0]
    assert filename == 'test.pdf'
    assert content == test_file_content
    
    print("Verification passed!")

if __name__ == "__main__":
    test_send_email_with_attachment()
