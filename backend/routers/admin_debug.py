from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models_db import User, UserRole
from auth import get_current_user
from services.email_service import send_email_smtp, test_connection
import logging

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"]
)

logger = logging.getLogger(__name__)

@router.post("/test-email")
def test_email_sending(target_email: str, current_user: User = Depends(get_current_user)):
    """
    Test email sending functionality. Only available to CORE users.
    """
    if current_user.role != UserRole.CORE:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # First test connection
        try:
            test_connection()
        except Exception as e:
            return {"success": False, "step": "connection_test", "error": str(e)}

        # Then try to send actual email
        subject = "Placement Pitcher - Test Email"
        body = f"This is a test email triggered by {current_user.email} from the admin debug panel."
        
        send_email_smtp(target_email, subject, body)
        
        return {"success": True, "message": f"Test email sent to {target_email}"}
    except Exception as e:
        logger.error(f"Admin test email failed: {e}")
        return {"success": False, "step": "sending", "error": str(e)}
