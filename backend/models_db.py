from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum

class UserRole(str, enum.Enum):
    CORE = "core"
    COORDINATOR = "coordinator"

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    # Could add owner_id if we want strict ownership, but for now Core role in team is enough
    
    members = relationship("User", back_populates="team")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default=UserRole.COORDINATOR)
    name = Column(String)
    invitation_token = Column(String, nullable=True)
    invitation_expires_at = Column(DateTime, nullable=True)
    
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True) # nullable for migration safety, but logic should enforce
    team = relationship("Team", back_populates="members")

    assigned_contacts = relationship("ContactForDB", foreign_keys="[ContactForDB.assigned_to_id]", back_populates="assigned_to")

class ContactForDB(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, index=True)
    hr_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    status = Column(String, default="Pending")  # Pending, Generated, Sent
    context = Column(Text, nullable=True) # Notes or specific pitch details
    row_index = Column(Integer) # To map back to Excel or just keep order

    phone = Column(String, nullable=True)
    phone_numbers = Column(Text, nullable=True) # CSV of additional phones
    linkedin = Column(String, nullable=True)
    additional_emails = Column(Text, nullable=True) # CSV of additional emails

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User", foreign_keys=[created_by_id], backref="created_contacts")

    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_contacts")

    sent_emails = relationship("SentEmail", back_populates="contact")
    replies = relationship("EmailReply", back_populates="contact")

class EmailReply(Base):
    __tablename__ = "email_replies"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    sender_email = Column(String)
    subject = Column(String)
    body = Column(Text)
    received_at = Column(DateTime)
    message_id = Column(String, unique=True, index=True)

    contact = relationship("ContactForDB", back_populates="replies")

class SentEmail(Base):
    __tablename__ = "sent_emails"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    subject = Column(String)
    body = Column(Text)
    attachment_names = Column(String, nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)

    contact = relationship("ContactForDB", back_populates="sent_emails")
