import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import os
import logging
import socket
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)

def get_ipv4_address(hostname: str, port: int) -> str:
    """
    Resolves hostname to the first available IPv4 address.
    """
    try:
        # socket.AF_INET forces IPv4
        addr_info = socket.getaddrinfo(hostname, port, family=socket.AF_INET, proto=socket.IPPROTO_TCP)
        # addr_info is list of (family, type, proto, canonname, sockaddr)
        # sockaddr is (ip, port)
        if addr_info:
            return addr_info[0][4][0]
    except Exception as e:
        logger.error(f"Failed to resolve IPv4 for {hostname}: {e}")
    return hostname # Fallback to original hostname if resolution fails

def test_connection() -> bool:
    """
    Tests the SMTP connection using environment credentials.
    Returns True if successful, raises Exception otherwise.
    """
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    sender_email = os.getenv("SMTP_EMAIL")
    sender_password = os.getenv("SMTP_PASSWORD")

    if not sender_email or not sender_password:
        logger.error("SMTP_EMAIL or SMTP_PASSWORD not set in environment.")
        raise ValueError("SMTP Credentials not set in environment variables.")
    
    try:
        logger.info("Testing SMTP connection...")
        # Resolve to IPv4 to avoid "Network is unreachable" on IPv6-unaware environments
        ipv4_server = get_ipv4_address(smtp_server, smtp_port)
        logger.info(f"Resolved {smtp_server} to {ipv4_server}")
        
        server = smtplib.SMTP(ipv4_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.quit()
        logger.info("SMTP connection verification successful.")
        return True
    except Exception as e:
        logger.error(f"SMTP connection test failed: {e}")
        # Re-raise to ensure startup fails and alerts user
        raise e

def send_email_smtp(to_email: str, subject: str, body: str, files: Optional[List[Tuple[str, bytes]]] = None, reply_to_message_id: Optional[str] = None):
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    sender_email = os.getenv("SMTP_EMAIL")
    sender_password = os.getenv("SMTP_PASSWORD")
    
    if not sender_email or not sender_password:
        logger.error("SMTP_EMAIL or SMTP_PASSWORD not set in environment.")
        raise ValueError("SMTP Credentials not set in environment variables.")

    logger.info(f"Attempting to send email to {to_email} with subject: '{subject}'")

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = subject
    
    if reply_to_message_id:
        msg['In-Reply-To'] = reply_to_message_id
        msg['References'] = reply_to_message_id
        
    msg.attach(MIMEText(body, 'plain'))

    if files:
        for filename, content in files:
            part = MIMEApplication(content, Name=filename)
            part['Content-Disposition'] = f'attachment; filename="{filename}"'
            msg.attach(part)

    try:
        # logger.info("Connecting to SMTP server...")
        # Force IPv4
        ipv4_server = get_ipv4_address(smtp_server, smtp_port)
        
        server = smtplib.SMTP(ipv4_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        text = msg.as_string()
        server.sendmail(sender_email, to_email, text)
        server.quit()
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        raise e

import imaplib
import email
from email.header import decode_header
from datetime import datetime
import email.utils

def check_for_replies(limit=20):
    """
    Connects to IMAP and fetches the latest `limit` emails.
    Returns a list of dicts: {'sender': str, 'subject': str, 'body': str, 'date': datetime, 'message_id': str}
    """
    imap_server = "imap.gmail.com"
    email_user = os.getenv("SMTP_EMAIL")
    email_pass = os.getenv("SMTP_PASSWORD")

    if not email_user or not email_pass:
        raise ValueError("IMAP Credentials not set.")

    mail = imaplib.IMAP4_SSL(imap_server)
    mail.login(email_user, email_pass)
    mail.select("inbox")

    status, messages = mail.search(None, "ALL")
    if status != "OK":
        return []

    email_ids = messages[0].split()
    # Get the latest `limit` emails
    latest_email_ids = email_ids[-limit:]

    fetched_emails = []

    for e_id in reversed(latest_email_ids):
        try:
            _, msg_data = mail.fetch(e_id, "(RFC822)")
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    
                    # Decode Subject
                    subject, encoding = decode_header(msg["Subject"])[0]
                    if isinstance(subject, bytes):
                        subject = subject.decode(encoding if encoding else "utf-8")
                    
                    # Decode From
                    from_header = msg.get("From")
                    sender_email = email.utils.parseaddr(from_header)[1]
                    
                    # Filter out emails from self
                    if sender_email == email_user:
                        continue

                    # Date
                    date_tuple = email.utils.parsedate_tz(msg["Date"])
                    if date_tuple:
                        local_date = datetime.fromtimestamp(email.utils.mktime_tz(date_tuple))
                    else:
                        local_date = datetime.now()

                    # Message ID
                    message_id = msg.get("Message-ID")
                    
                    # Body
                    body = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition"))
                            
                            if "attachment" not in content_disposition:
                                if content_type == "text/plain":
                                    body = part.get_payload(decode=True).decode()
                                    break # Prefer plain text
                                elif content_type == "text/html":
                                    body = part.get_payload(decode=True).decode()
                    else:
                         body = msg.get_payload(decode=True).decode()

                    # Strip quoted text
                    body = strip_quoted_text(body)

                    fetched_emails.append({
                        "sender": sender_email,
                        "subject": subject,
                        "body": body,
                        "received_at": local_date,
                        "message_id": message_id
                    })
        except Exception as e:
            print(f"Error reading email {e_id}: {e}")
            continue

    mail.close()
    mail.logout()
    return fetched_emails

import re

def strip_quoted_text(body: str) -> str:
    """
    Strips quoted text from email replies.
    Matches patterns like:
    - On [Date], [Name] <email> wrote:
    - -----Original Message-----
    - > (quoted lines)
    """
    if not body:
        return ""

    # Common separators
    separators = [
        r'On\s+.*wrote:',  # On ... wrote:
        r'-+\s*Original Message\s*-+',  # -----Original Message-----
        r'From:\s+.*',  # From: ... (often start of forwarded/replied)
        r'________________________________', # Underscore line
    ]
    
    # Split by separator and take the first part
    for sep in separators:
        # specific regex for "On ... wrote:" which can span multiple lines
        if "wrote:" in sep:
             match = re.search(r'On\s+.*wrote:', body, re.IGNORECASE | re.DOTALL)
             if match:
                 body = body[:match.start()]
                 continue

        match = re.search(sep, body, re.IGNORECASE)
        if match:
             body = body[:match.start()]
    
    # Also strip lines ensuring they don't look like common signatures if possible, 
    # but primarily strip checks for the *start* of the quote.
    
    return body.strip()
