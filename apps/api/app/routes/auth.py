from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import SignupRequest, LoginRequest, TokenResponse
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", status_code=201)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    return auth_service.signup(payload, db)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login(payload, db)


@router.post("/login-invite", response_model=TokenResponse)
def login_invite(
    email: str = Query(...),
    password: str = Query(...),
    db: Session = Depends(get_db),
):
    """Used by invite flow to auto-verify + login in one step."""
    return auth_service.login_invite(email, password, db)


@router.get("/verify", response_model=TokenResponse)
def verify_email(token: str = Query(...), db: Session = Depends(get_db)):
    return auth_service.verify_email(token, db)


@router.post("/resend-verification")
def resend_verification(email: str = Query(...), db: Session = Depends(get_db)):
    return auth_service.resend_verification(email, db)
