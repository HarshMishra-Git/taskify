import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import SignupRequest, LoginRequest, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.models.invite import ProjectInvite
from app.services.email_service import send_verification_email


def _generate_token() -> tuple[str, str]:
    """Returns (raw_token, hashed_token). Store hash, send raw."""
    raw   = secrets.token_urlsafe(32)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def signup(payload: SignupRequest, db: Session) -> dict:
    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    raw_token, hashed_token = _generate_token()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=30)

    # Check if signing up via invite to auto-verify
    is_verified = False
    skip_email  = False

    if payload.invite_token:
        invite_hash = hashlib.sha256(payload.invite_token.encode()).hexdigest()
        invite = db.query(ProjectInvite).filter(
            ProjectInvite.token == invite_hash,
            ProjectInvite.email == email,
            ProjectInvite.accepted_at == None,
            ProjectInvite.token_expiry > datetime.now(timezone.utc)
        ).first()
        
        if invite:
            is_verified = True
            skip_email  = True

    user = User(
        name=payload.name,
        email=email,
        password=hash_password(payload.password),
        is_verified=is_verified,
        verification_token=None if is_verified else hashed_token,
        token_expiry=None if is_verified else expiry,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if not skip_email:
        try:
            send_verification_email(user.email, user.name, raw_token)
        except Exception as e:
            import logging; logging.getLogger(__name__).error("[EMAIL ERROR] %s", e)

    return {
        "message": "Account created. Check your email to verify." if not skip_email else "Account created successfully.",
        "is_verified": is_verified
    }


def resend_verification(email: str, db: Session) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal whether email exists
        return {"message": "If that email exists, a verification link has been sent."}
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    raw_token, hashed_token = _generate_token()
    user.verification_token = hashed_token
    user.token_expiry = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.commit()

    try:
        send_verification_email(user.email, user.name, raw_token)
    except Exception as e:
        import logging; logging.getLogger(__name__).error("[EMAIL ERROR] %s", e)

    return {"message": "If that email exists, a verification link has been sent."}


def verify_email(token: str, db: Session) -> TokenResponse:
    hashed = hashlib.sha256(token.encode()).hexdigest()
    user = db.query(User).filter(User.verification_token == hashed).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    if user.token_expiry and user.token_expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification link has expired")

    user.is_verified          = True
    user.verification_token   = None
    user.token_expiry         = None
    db.commit()

    return TokenResponse(access_token=create_access_token(str(user.id)))


def login(payload: LoginRequest, db: Session) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before signing in")
    return TokenResponse(access_token=create_access_token(str(user.id)))


def login_invite(email: str, password: str, db: Session) -> TokenResponse:
    """Login variant used after invite signup — skips verification check."""
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    # Auto-verify user who signed up via invite
    if not user.is_verified:
        user.is_verified        = True
        user.verification_token = None
        user.token_expiry       = None
        db.commit()
    return TokenResponse(access_token=create_access_token(str(user.id)))
