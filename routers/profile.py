from fastapi import APIRouter
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status

import models
import schemas
from auth import get_current_user, get_db, verify_password, hash_password

router = APIRouter(prefix="/users",tags=["profile"])

@router.get("/profile", response_model=schemas.UserProfileResponse)
def get_profile(
    current_user: models.User = Depends(get_current_user)
):
    return current_user

@router.patch("/password")
def change_password(
    payload: schemas.PasswordChange,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Change user's password.
    
    Requirements:
    - Must provide current password for verification
    - New password must be at least 8 characters
    - New password must be different from current password
    
    Security considerations:
    - Verifies current password before allowing change
    - Hashes new password using bcrypt
    - Returns generic success message (no sensitive data)
    """
    # Verify current password
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Ensure new password is different from current
    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )
    
    # Validate new password strength (basic check)
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long"
        )
    
    # Update password
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

@router.delete("/account")
def delete_account(
    payload: schemas.AccountDeletionConfirm,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Permanently delete user account and all associated data.
    
    This is a DESTRUCTIVE operation that:
    - Deletes the user record from database
    - Automatically cascades to delete all learning items (via CASCADE)
    - Automatically cascades to delete all sessions (via CASCADE)
    - This action CANNOT be undone
    
    Requirements:
    - Must provide current password for verification
    - Must type "DELETE" exactly as confirmation
    """
    # Verify password
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password is incorrect"
        )
    
    # Verify confirmation string
    if payload.confirmation != "DELETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation must be exactly 'DELETE'"
        )
    
    # Delete user - CASCADE handles learning_items and learning_sessions
    db.delete(current_user)
    db.commit()
    
    return {
        "message": "Account and all associated data permanently deleted"
    }
