from pydantic import BaseModel
from typing import Optional, List

class Contact(BaseModel):
    id: Optional[int] = None
    company_name: str
    hr_name: Optional[str] = None
    email: Optional[str] = None
    status: str = "Pending"  # Pending, Generated, Sent
    context: Optional[str] = None # Notes or specific pitch details
    row_index: int # To map back to Excel
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None # Helper for UI
    phone: Optional[str] = None
    phone_numbers: Optional[str] = None
    linkedin: Optional[str] = None
    additional_emails: Optional[str] = None
    created_by_id: Optional[int] = None
    replies: List['EmailReplyModel'] = []
    sent_emails: List['SentEmailModel'] = []

class EmailReplyModel(BaseModel):
    id: int
    subject: Optional[str]
    body: Optional[str]
    received_at: Optional[str] # datetime serialized
    sender_email: Optional[str]

class SentEmailModel(BaseModel):
    id: int
    subject: Optional[str]
    body: Optional[str]
    sent_at: Optional[str]
    attachment_names: Optional[str] = None

class EmailGenerationRequest(BaseModel):
    contact: Contact
    # Additional context provided by user if any

class EmailstartRequest(BaseModel):
    contact: Contact
    subject: str
    body: str
