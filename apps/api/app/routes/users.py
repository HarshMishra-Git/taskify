from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserOut
from fastapi import HTTPException, status

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/by-email", response_model=UserOut)
def get_user_by_email(
    email: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
