import pandas as pd
from typing import List
from models import Contact
import io

def read_contacts_from_file(file_content: bytes, filename: str) -> List[Contact]:
    if filename.endswith('.csv'):
        df = pd.read_csv(io.BytesIO(file_content))
    else:
        df = pd.read_excel(io.BytesIO(file_content))
    
    contacts = []
    # Normalize headers to lowercase for easier matching
    df.columns = df.columns.str.lower()
    
    for index, row in df.iterrows():
        # Map columns safely
        email_full = str(row.get('email', ''))
        emails = [e.strip() for e in email_full.split(',') if e.strip()]
        primary_email = emails[0] if emails else None
        additional_emails = ", ".join(emails[1:]) if len(emails) > 1 else None

        phone_full = str(row.get('phone', row.get('mobile', '')))
        phones = [p.strip() for p in phone_full.split(',') if p.strip() and p.strip() != 'nan']
        primary_phone = phones[0] if phones else None
        additional_phones = ", ".join(phones[1:]) if len(phones) > 1 else None

        linkedin = str(row.get('linkedin', row.get('linkedin url', '')))
        if linkedin == 'nan': linkedin = None

        contact = Contact(
            company_name=str(row.get('company', row.get('company name', 'Unknown'))),
            hr_name=str(row.get('hr name', row.get('hr', ''))),
            email=primary_email,
            additional_emails=additional_emails,
            phone=primary_phone,
            phone_numbers=additional_phones,
            linkedin=linkedin,
            context=str(row.get('context', row.get('notes', ''))),
            status=str(row.get('status', 'Pending')),
            row_index=index
        )
        # Clean up 'nan' strings from pandas
        if contact.hr_name == 'nan': contact.hr_name = None
        if contact.context == 'nan': contact.context = None
        
        contacts.append(contact)
    
    return contacts
