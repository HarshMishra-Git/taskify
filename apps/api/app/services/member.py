import uuid
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.project import ProjectMember, RoleEnum, Project
from app.models.invite import ProjectInvite
from app.models.user import User
from app.schemas.member import MemberAdd, MemberOut
from app.services.email_service import send_project_invite_email


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def add_member(project_id: uuid.UUID, payload: MemberAdd, current_user: User, db: Session) -> MemberOut:
    membership = db.query(ProjectMember).filter(
        ProjectMember.user_id == current_user.id,
        ProjectMember.project_id == project_id,
    ).first()

    if not membership or membership.role != RoleEnum.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can add members")

    target_user = db.get(User, payload.user_id)
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = db.query(ProjectMember).filter(
        ProjectMember.user_id == payload.user_id,
        ProjectMember.project_id == project_id,
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already a member")

    member = ProjectMember(user_id=payload.user_id, project_id=project_id, role=payload.role)
    db.add(member)
    db.commit()
    db.refresh(member)

    # Send invite email (non-blocking)
    project = db.get(Project, project_id)
    try:
        raw_token = secrets.token_urlsafe(32)
        invite = ProjectInvite(
            email=target_user.email,
            project_id=project_id,
            role=payload.role,
            token=_hash_token(raw_token),
            token_expiry=datetime.now(timezone.utc) + timedelta(hours=24),
            created_by=current_user.id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(invite)
        db.commit()
        send_project_invite_email(
            email=target_user.email,
            project_name=project.name if project else "a project",
            inviter_name=current_user.name,
            token=raw_token,
            role=payload.role.value,
        )
    except Exception as e:
        import logging; logging.getLogger(__name__).error("[EMAIL ERROR] %s", e)

    return MemberOut(
        user_id=member.user_id,
        project_id=member.project_id,
        role=member.role,
        name=target_user.name,
        email=target_user.email,
    )


def add_member_by_email(project_id: uuid.UUID, email: str, role: RoleEnum, current_user: User, db: Session) -> dict:
    """Add member by email — creates pending invite if user doesn't exist yet."""
    membership = db.query(ProjectMember).filter(
        ProjectMember.user_id == current_user.id,
        ProjectMember.project_id == project_id,
    ).first()
    if not membership or membership.role != RoleEnum.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can add members")

    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    target_user = db.query(User).filter(User.email == email.lower().strip()).first()

    raw_token = secrets.token_urlsafe(32)
    hashed    = _hash_token(raw_token)
    expiry    = datetime.now(timezone.utc) + timedelta(hours=24)

    if target_user:
        # User exists — add directly
        existing = db.query(ProjectMember).filter(
            ProjectMember.user_id == target_user.id,
            ProjectMember.project_id == project_id,
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="User already a member")

        member = ProjectMember(user_id=target_user.id, project_id=project_id, role=role)
        db.add(member)

    # Always create invite record (for the email link / project redirect)
    invite = ProjectInvite(
        email=email.lower().strip(),
        project_id=project_id,
        role=role,
        token=hashed,
        token_expiry=expiry,
        created_by=current_user.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(invite)
    db.commit()

    try:
        send_project_invite_email(
            email=email,
            project_name=project.name,
            inviter_name=current_user.name,
            token=raw_token,
            role=role.value,
        )
    except Exception as e:
        import logging; logging.getLogger(__name__).error("[EMAIL ERROR] %s", e)

    return {"message": "Invite sent", "user_exists": target_user is not None}


def accept_invite(token: str, user: User, db: Session) -> dict:
    """Accept a project invite — adds user to project if not already member."""
    hashed = _hash_token(token)
    invite = db.query(ProjectInvite).filter(ProjectInvite.token == hashed).first()

    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or expired invite link")
    if invite.token_expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite link has expired")

    # Mark accepted regardless
    if not invite.accepted_at:
        invite.accepted_at = datetime.now(timezone.utc)

    existing = db.query(ProjectMember).filter(
        ProjectMember.user_id == user.id,
        ProjectMember.project_id == invite.project_id,
    ).first()

    if not existing:
        member = ProjectMember(user_id=user.id, project_id=invite.project_id, role=invite.role)
        db.add(member)

    db.commit()
    return {"project_id": str(invite.project_id)}


def get_invite_info(token: str, db: Session) -> dict:
    """Return invite metadata for the frontend /invite page."""
    hashed = _hash_token(token)
    invite = db.query(ProjectInvite).filter(ProjectInvite.token == hashed).first()

    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or expired invite link")
    if invite.token_expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite link has expired")

    project = db.get(Project, invite.project_id)
    user_exists = db.query(User).filter(User.email == invite.email).first() is not None

    return {
        "email":        invite.email,
        "project_id":   str(invite.project_id),
        "project_name": project.name if project else "",
        "role":         invite.role.value,
        "user_exists":  user_exists,
    }
