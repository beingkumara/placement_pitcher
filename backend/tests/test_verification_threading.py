from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Mock libraries to avoid import errors from missing dependencies/GCP
# Since we are testing logic in main.py, we can mock the services.
mock_modules = {
    'google.generativeai': MagicMock(), 
    'google.ai.generativelanguage': MagicMock(),
    'services.excel_service': MagicMock(), # Skip pandas import
    'services.agent_service': MagicMock()
}
with patch.dict(sys.modules, mock_modules):
    import main
    from main import app, get_current_user, get_db
    from models_db import EmailReply, SentEmail

client = TestClient(app)

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
    
    reply = EmailReply(id=1, contact_id=1, message_id="<existing-reply-id@mail.com>", received_at="2024-01-01T12:00:00")
    
    def side_effect(model):
        q = MagicMock()
        if model == EmailReply:
             q.filter.return_value.order_by.return_value.first.return_value = reply
        else:
             q.filter.return_value.first.return_value = contact
        return q
    
    db.query.side_effect = side_effect
    yield db

app.dependency_overrides[get_current_user] = mock_get_current_user
app.dependency_overrides[get_db] = mock_get_db

def test_send_email_threading_and_attachment():
    # Manual patch to ensure we patch the loaded module
    original_send = main.send_email_smtp
    mock_send_email = MagicMock(return_value=True)
    main.send_email_smtp = mock_send_email
    
    try:
        test_file_content = b"Content"
        files = [
            ('files', ('doc.pdf', test_file_content, 'application/pdf'))
        ]
        data = {
            'subject': 'Reply Subj',
            'body': 'Reply Body',
            'contact_email': 'test@example.com',
            'contact_company_name': 'TestCompany'
        }
        
        response = client.post("/api/send-email", data=data, files=files)
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        assert response.status_code == 200
        
        # Verify mock was called
        mock_send_email.assert_called_once()
        args, kwargs = mock_send_email.call_args
        
        # Check threading
        # Note: Depending on how kwargs are passed, it might be reply_to_message_id=...
        assert kwargs.get('reply_to_message_id') == "<existing-reply-id@mail.com>"
        
        # Check files
        sent_files = kwargs.get('files')
        assert len(sent_files) == 1
        assert sent_files[0][0] == 'doc.pdf'
        
        print("Verification passed for threading and attachments!")
        
    finally:
        main.send_email_smtp = original_send

if __name__ == "__main__":
    test_send_email_threading_and_attachment()
