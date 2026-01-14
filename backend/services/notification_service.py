from services.email_service import send_email_smtp

def notify_assignment(to_email: str, count: int):
    """
    Sends an email to the coordinator notifying them of new assignments.
    """
    subject = "New Companies Assigned"
    body = f"""
    Hello,

    You have been assigned {count} new companies to pitch to.
    Please log in to the Placement Pitcher portal to view and manage your assignments.

    Best regards,
    Placement Core Team
    """
    try:
        send_email_smtp(to_email, subject, body)
        print(f"Assignment notification sent to {to_email}")
    except Exception as e:
        print(f"Failed to send assignment notification to {to_email}: {e}")
        # We don't want to fail the request if notification fails, so just log it.

def notify_invitation(to_email: str, link: str, name: str):
    """
    Sends an email to the new user with their invitation link.
    """
    subject = "Welcome to Placement Pitcher - Set Up Your Account"
    body = f"""
    Hello {name},

    Welcome to the Placement Pitcher team!
    Please click the link below to set up your password and access your account:

    {link}

    This link will expire in 48 hours.

    Best regards,
    Placement Core Team
    """
    try:
        send_email_smtp(to_email, subject, body)
        print(f"Invitation notification sent to {to_email}")
    except Exception as e:
        print(f"Failed to send invitation notification to {to_email}: {e}")
