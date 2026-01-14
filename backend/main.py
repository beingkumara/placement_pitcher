from dotenv import load_dotenv
import os
import secrets
from datetime import datetime, timedelta


# Load env vars before imports to ensure they are available for module-level configs
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from services.excel_service import read_contacts_from_file
from services.agent_service import generate_pitch_email
from services.email_service import send_email_smtp, check_for_replies
from services import notification_service
from models import Contact, EmailGenerationRequest, EmailstartRequest, EmailReplyModel, SentEmailModel
from models_db import ContactForDB, SentEmail, User, UserRole, EmailReply, Team
from database import engine, get_db, Base
from auth import get_current_user, get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta
from typing import List, Optional
from pydantic import BaseModel

class ContactUpdate(BaseModel):
    hr_name: Optional[str] = None
    email: Optional[str] = None
    context: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    # For UI simplicity, we might receive concatenated strings and split them in backend
    additional_emails: Optional[str] = None 
    phone_numbers: Optional[str] = None

# Create tables
# Create tables moved to startup event

app = FastAPI(title="Placement Pitcher Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models for Auth & User Management ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    id: int

class UserCreate(BaseModel):
    email: str
    name: str
    role: UserRole = UserRole.COORDINATOR

class CoreUserCreate(UserCreate):
    admin_secret: str


class SetupAccountRequest(BaseModel):
    token: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str

    class Config:
        from_attributes = True

class AssignRequest(BaseModel):
    contact_ids: List[int]
    user_id: int

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "name": user.name, "id": user.id}

# --- User Management Routes (Core Only) ---

@app.post("/api/users", response_model=UserResponse)
def create_user(user: UserCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.CORE:
        raise HTTPException(status_code=403, detail="Not authorized to create users")
    
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate invitation
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=48)
    
    new_user = User(
        email=user.email, 
        name=user.name, 
        role=user.role,
        invitation_token=token,
        invitation_expires_at=expires_at,
        team_id=current_user.team_id # Assign to same team
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send invitation email
    try:
        # Assuming frontend runs on same host/port logic or specific env var
        # For local dev: http://localhost:5173
        base_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        invite_link = f"{base_url}/?token={token}"
        notification_service.notify_invitation(new_user.email, invite_link, new_user.name)
    except Exception as e:
        print(f"Failed to send invitation email: {e}")

    return new_user

@app.post("/api/admin/create-core", response_model=UserResponse)
def create_core_user(user: CoreUserCreate, db: Session = Depends(get_db)):
    # Validate secret
    expected_secret = os.getenv("CORE_CREATION_SECRET")
    if not expected_secret or user.admin_secret != expected_secret:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create Team for new Core
    new_team = Team(name=f"{user.name}'s Team")
    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    
    # Generate invitation
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=48)
    
    new_user = User(
        email=user.email, 
        name=user.name, 
        role=UserRole.CORE,
        invitation_token=token,
        invitation_expires_at=expires_at,
        team_id=new_team.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send invitation email
    try:
        base_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        invite_link = f"{base_url}/?token={token}"
        notification_service.notify_invitation(new_user.email, invite_link, new_user.name)
    except Exception as e:
        print(f"Failed to send invitation email: {e}")

    return new_user

@app.post("/api/setup-account")
def setup_account(request: SetupAccountRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.invitation_token == request.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
        
    if user.invitation_expires_at and user.invitation_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invitation expired")
        
    hashed_password = get_password_hash(request.password)
    user.password_hash = hashed_password
    user.invitation_token = None
    user.invitation_expires_at = None
    
    db.commit()
    return {"message": "Account setup successfully. You can now login."}

@app.get("/api/users", response_model=List[UserResponse])
def get_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.CORE:
        # Coordinators might need to see list? For now restrict to Core.
        raise HTTPException(status_code=403, detail="Not authorized to view users")
    
    # Filter users: only show members of the same team
    users = db.query(User).filter(User.team_id == current_user.team_id).all()
    return users

# --- Assignment Routes ---

@app.post("/api/assign")
def assign_contacts(request: AssignRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Core assigns a list of contacts to a user"""
    if current_user.role != UserRole.CORE:
        raise HTTPException(status_code=403, detail="Only Core can assign contacts")

    target_user = db.query(User).filter(User.id == request.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
        
    # Enforce strict team isolation
    if target_user.team_id != current_user.team_id:
        raise HTTPException(status_code=403, detail="Cannot assign to user outside your team")

    assigned_count = 0
    for cid in request.contact_ids:
        contact = db.query(ContactForDB).filter(ContactForDB.id == cid).first()
        if contact:
            contact.assigned_to_id = target_user.id
            assigned_count += 1
    
    db.commit()

    # Send notification
    try:
        notification_service.notify_assignment(target_user.email, assigned_count)
    except Exception as e:
        print(f"Failed to send assignment notification: {e}")

    return {"message": f"Successfully assigned {assigned_count} contacts to {target_user.name}"}

# --- Existing Routes Modified ---

@app.get("/")
def read_root():
    return {"message": "Placement Pitcher Agent API is running"}

@app.post("/api/contacts", response_model=Contact)
def create_contact(contact: Contact, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Logic for manual creation
    assigned_to_id = None
    if current_user.role == UserRole.COORDINATOR:
        assigned_to_id = current_user.id # Auto-assign to self
    else:
        assigned_to_id = contact.assigned_to_id # Core can assign or leave null

    # Handle multiple emails/phones if passed as simple string in 'email' or 'phone' 
    # But simplified: Assume frontend sends correct fields or we split here.
    # Let's standardize: primary email in 'email', others in 'additional_emails'
    
    db_contact = ContactForDB(
        company_name=contact.company_name,
        hr_name=contact.hr_name,
        email=contact.email,
        phone=contact.phone,
        phone_numbers=contact.phone_numbers,
        linkedin=contact.linkedin,
        additional_emails=contact.additional_emails,
        status=contact.status,
        context=contact.context,
        row_index=0, # Manual add
        created_by_id=current_user.id,
        assigned_to_id=assigned_to_id
    )
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

@app.delete("/api/contacts/{contact_id}")
def delete_contact(contact_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contact = db.query(ContactForDB).filter(ContactForDB.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    if current_user.role != UserRole.CORE:
        # Coordinator can only delete their own created contacts
        if contact.created_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="Cannot delete contacts created by others")

    db.delete(contact)
    db.commit()
    return {"message": "Contact deleted successfully"}

@app.post("/api/upload", response_model=List[Contact])
async def upload_file(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only Core can upload? Let's assume yes for now
    if current_user.role != UserRole.CORE:
         raise HTTPException(status_code=403, detail="Only Core can upload contacts")

    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload Excel or CSV.")
    
    content = await file.read()
    try:
        contacts_data = read_contacts_from_file(content, file.filename)
        
        saved_contacts = []
        for c in contacts_data:
            # Check for duplicates by email or company/hr combo
            existing = None
            if c.email:
                existing = db.query(ContactForDB).filter(ContactForDB.email == c.email).first()
            
            if not existing:
                existing = db.query(ContactForDB).filter(
                    ContactForDB.company_name == c.company_name, 
                    ContactForDB.hr_name == c.hr_name
                ).first()
            
            if existing:
                continue

            db_contact = ContactForDB(
                company_name=c.company_name,
                hr_name=c.hr_name,
                email=c.email,
                phone=c.phone,
                phone_numbers=c.phone_numbers,
                linkedin=c.linkedin,
                additional_emails=c.additional_emails,
                status=c.status,
                context=c.context,
                row_index=c.row_index,
                created_by_id=current_user.id,
                assigned_to_id=None
            )
            db.add(db_contact)
            db.commit()
            db.refresh(db_contact)
            
            saved_contacts.append(Contact(
                id=db_contact.id,
                company_name=db_contact.company_name,
                hr_name=db_contact.hr_name,
                email=db_contact.email,
                status=db_contact.status,
                context=db_contact.context,
                row_index=db_contact.row_index,
                assigned_to_id=db_contact.assigned_to_id
            ))
            
        return saved_contacts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@app.get("/api/contacts", response_model=List[Contact])
def get_contacts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(ContactForDB)
    
    # Core sees all IN THEIR TEAM, Coordinator sees only assigned
    if current_user.role == UserRole.CORE:
        # Filter contacts created by users in the same team
        query = query.join(User, ContactForDB.created_by_id == User.id).filter(User.team_id == current_user.team_id)
    else:
        query = query.filter(ContactForDB.assigned_to_id == current_user.id)
    
    contacts = query.all()
    # Modify Contact model or response to include assigned user info if needed?
    # For now keeping simple Contact model but filtering results.
    return [
        Contact(
            id=c.id,
            company_name=c.company_name,
            hr_name=c.hr_name,
            email=c.email,
            phone=c.phone,
            phone_numbers=c.phone_numbers,
            linkedin=c.linkedin,
            additional_emails=c.additional_emails,
            status=c.status,
            context=c.context,
            row_index=c.row_index,
            assigned_to_id=c.assigned_to_id,
            assigned_to_name=c.assigned_to.name if c.assigned_to else None,
            created_by_id=c.created_by_id,

            replies=[
                EmailReplyModel(
                    id=r.id,
                    subject=r.subject, 
                    body=r.body, 
                    sender_email=r.sender_email,
                    received_at=r.received_at.isoformat() if r.received_at else None
                ) for r in c.replies
            ],
            sent_emails=[
                SentEmailModel(
                    id=s.id,
                    subject=s.subject,
                    body=s.body,
                    sent_at=s.sent_at.isoformat() if s.sent_at else None,
                    attachment_names=s.attachment_names
                ) for s in c.sent_emails
            ]
        ) for c in contacts
    ]

@app.post("/api/check-replies")
def check_replies(db: Session = Depends(get_db)):
    # Fetch replies
    try:
        raw_replies = check_for_replies(limit=20)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    saved_count = 0
    # Map email -> contact_id. Prefer most recently created contact if duplicates? 
    # Or just all matching contacts.
    contacts = db.query(ContactForDB.email, ContactForDB.id).filter(ContactForDB.email.isnot(None)).all()
    # Normalize to lowercase for matching
    contact_map = {c.email.lower(): c.id for c in contacts}
    
    for r in raw_replies:
        sender_clean = r['sender'].lower()
        if sender_clean in contact_map:
            # Check if exists
            exists = db.query(EmailReply).filter(EmailReply.message_id == r['message_id']).first()
            if not exists:
                new_reply = EmailReply(
                    contact_id=contact_map[sender_clean],
                    sender_email=r['sender'],
                    subject=r['subject'],
                    body=r['body'],
                    received_at=r['received_at'],
                    message_id=r['message_id']
                )
                db.add(new_reply)
                saved_count += 1
    
    if saved_count > 0:
        db.commit()
        
    return {"message": f"Checked emails. Found {len(raw_replies)} recent, saved {saved_count} new replies."}

@app.put("/api/contacts/{contact_id}", response_model=Contact)
def update_contact(contact_id: int, contact_update: ContactUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_contact = db.query(ContactForDB).filter(ContactForDB.id == contact_id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Check authorization: Core can edit all, Coordinator only assigned
    if current_user.role != UserRole.CORE and db_contact.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this contact")

    # Handle updates for all fields
    # Just update whatever is sent
    for field, value in contact_update.dict(exclude_unset=True).items():
        setattr(db_contact, field, value)
    
    db.commit()
    db.refresh(db_contact)

    return Contact(
        id=db_contact.id,
        company_name=db_contact.company_name,
        hr_name=db_contact.hr_name,
        email=db_contact.email,
        phone=db_contact.phone,
        phone_numbers=db_contact.phone_numbers,
        linkedin=db_contact.linkedin,
        additional_emails=db_contact.additional_emails,
        status=db_contact.status,
        context=db_contact.context,
        row_index=db_contact.row_index,
        assigned_to_id=db_contact.assigned_to_id,
        assigned_to_name=db_contact.assigned_to.name if db_contact.assigned_to else None,
        created_by_id=db_contact.created_by_id
    )

@app.post("/api/generate-email")
def generate_email(request: EmailGenerationRequest, current_user: User = Depends(get_current_user)):
    try:
        result = generate_pitch_email(request.contact)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.post("/api/send-email")
async def send_email(
    subject: str = Form(...),
    body: str = Form(...),
    contact_email: str = Form(...),
    contact_company_name: str = Form(...),
    files: List[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Check if user is assigned to this contact (if not core)
        contact = db.query(ContactForDB).filter(
            ContactForDB.email == contact_email,
            ContactForDB.company_name == contact_company_name
        ).first()

        if not contact:
             raise HTTPException(status_code=404, detail="Contact not found")

        if current_user.role != UserRole.CORE and contact.assigned_to_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not authorized to email this contact")

        # Process attachments
        attachments = []
        if files:
            for file in files:
                content = await file.read()
                attachments.append((file.filename, content))

        # Check for threading (find latest reply)
        latest_reply = db.query(EmailReply).filter(EmailReply.contact_id == contact.id).order_by(EmailReply.received_at.desc()).first()
        reply_to_message_id = latest_reply.message_id if latest_reply else None

        # Send actual email
        success = send_email_smtp(contact_email, subject, body, files=attachments, reply_to_message_id=reply_to_message_id)
        
        if contact:
            contact.status = "Sent"
            
            attachment_names_str = ",".join([f[0] for f in attachments]) if attachments else None
            
            sent_email = SentEmail(
                contact_id=contact.id,
                subject=subject,
                body=body,
                attachment_names=attachment_names_str
            )
            db.add(sent_email)
            db.commit()

        return {"success": success, "message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@app.get("/api/sent-emails")
def get_sent_emails(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(SentEmail).join(ContactForDB)
    
    if current_user.role == UserRole.CORE:
        # Show all sent emails for the team
        query = query.join(User, ContactForDB.created_by_id == User.id).filter(User.team_id == current_user.team_id)
    else:
        # Show only assigned (or created?) - stick to assigned for consistency
        query = query.filter(ContactForDB.assigned_to_id == current_user.id)

    sent_emails = query.all()
    return [
        {
            "id": email.id,
            "subject": email.subject,
            "sent_at": email.sent_at,
            "contact_company": email.contact.company_name if email.contact else "Unknown",
            "contact_email": email.contact.email if email.contact else "Unknown"
        } 
        for email in sent_emails
    ]

# Setup initial user if DB is empty
@app.on_event("startup")
def startup_event():
    # Helper to seed a core user if none exists
    db = next(get_db())
    # Create tables
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Error creating tables: {e}")
        
    try:
        core_user = db.query(User).filter(User.role == UserRole.CORE).first()
        if not core_user:
            try:
                pwd = get_password_hash("admin123")
                user = User(email="admin@example.com", password_hash=pwd, role=UserRole.CORE, name="Admin Core")
                db.add(user)
                db.commit()
                print("Seeded admin user: admin@example.com / admin123")
            except Exception as e:
                print(f"Error seeding user: {e}")
    except Exception as e:
        print(f"Error checking for core user (DB might be unreachable): {e}")
