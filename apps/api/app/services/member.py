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


def _add_member(project_id: uuid.UUID, user_id: uuid.UUID, role: RoleEnum, db: Session) -> ProjectMember:
    existing = db.query(ProjectMember).filter(
        ProjectMember.user_id == user_id,
        ProjectMember.project_id == project_id,
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already a member")
    
    member = ProjectMember(user_id=user_id, project_id=project_id, role=role)
    db.add(member)
    db.flush()
    return member


def _create_invite(project_id: uuid.UUID, email: str, role: RoleEnum, inviter: User, db: Session) -> str:
    email = email.lower().strip()
    existing_invite = db.query(ProjectInvite).filter(
        ProjectInvite.project_id == project_id,
        ProjectInvite.email == email,
        ProjectInvite.accepted_at == None
    ).first()

    if existing_invite:
        raise HTTPException(status_code=409, detail="Invite already exists")

    raw_token = secrets.token_urlsafe(32)
    invite = ProjectInvite(
        email=email,
        project_id=project_id,
        role=role,
        token=_hash_token(raw_token),
        token_expiry=datetime.now(timezone.utc) + timedelta(hours=24),
        created_by=inviter.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(invite)
    return raw_token


def add_member(project_id: uuid.UUID, payload: MemberAdd, current_user: User, db: Session) -> MemberOut:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    target_user = db.get(User, payload.user_id)
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    raw_token = None
    try:
        member = _add_member(project_id, target_user.id, payload.role, db)
        raw_token = _create_invite(project_id, target_user.email, payload.role, current_user, db)
        db.commit()
        db.refresh(member)
    except Exception:
        db.rollback()
        raise

    if raw_token:
        try:
            send_project_invite_email(
                email=target_user.email,
                project_name=project.name,
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
    email = email.lower().strip()
    if email == current_user.email.lower():
        raise HTTPException(status_code=400, detail="You cannot invite yourself")

    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    target_user = db.query(User).filter(User.email == email).first()

    raw_token = None
    try:
        if target_user:
            existing = db.query(ProjectMember).filter(
                ProjectMember.user_id == target_user.id,
                ProjectMember.project_id == project_id,
            ).first()
            if existing:
                raise HTTPException(status_code=409, detail="User already a member")

            _add_member(project_id, target_user.id, role, db)
        
        raw_token = _create_invite(project_id, email, role, current_user, db)
        db.commit()
    except Exception:
        db.rollback()
        raise

    if raw_token:
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


def remove_member(project_id: uuid.UUID, target_user_id: uuid.UUID, current_user: User, db: Session) -> None:
    if target_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself")
    
    target = db.query(ProjectMember).filter(
        ProjectMember.user_id == target_user_id,
        ProjectMember.project_id == project_id,
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    
    db.delete(target)
    db.commit()


def revoke_invite(project_id: uuid.UUID, email: str, current_user: User, db: Session) -> None:
    email = email.lower().strip()
    deleted = db.query(ProjectInvite).filter(
        ProjectInvite.project_id == project_id,
        ProjectInvite.email == email,
        ProjectInvite.accepted_at == None,  # noqa: E711
    ).delete()

    if not deleted:
        raise HTTPException(status_code=404, detail="Invite not found")

    db.commit()


def accept_invite(token: str, user: User, db: Session) -> dict:
    hashed = _hash_token(token)
    invite = db.query(ProjectInvite).filter(ProjectInvite.token == hashed).first()

    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or expired invite link")
    
    if invite.accepted_at:
        raise HTTPException(status_code=400, detail="Invite already accepted")

    if invite.token_expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite link has expired")
    
    if invite.email.lower() != user.email.lower():
        raise HTTPException(status_code=403, detail="This invite was sent to a different email address")

    try:
        invite.accepted_at = datetime.now(timezone.utc)

        existing = db.query(ProjectMember).filter(
            ProjectMember.user_id == user.id,
            ProjectMember.project_id == invite.project_id,
        ).first()

        if not existing:
            _add_member(invite.project_id, user.id, invite.role, db)

        db.commit()
        return {"project_id": str(invite.project_id)}
    except Exception:
        db.rollback()
        raise


def get_invite_info(token: str, db: Session) -> dict:
    hashed = _hash_token(token)
    invite = db.query(ProjectInvite).filter(ProjectInvite.token == hashed).first()

    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or expired invite link")
    if invite.token_expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite link has expired")

    project = db.get(Project, invite.project_id)
    user_exists = db.query(User).filter(User.email == invite.email.lower()).first() is not None

    return {
        "email":        invite.email,
        "project_id":   str(invite.project_id),
        "project_name": project.name if project else "",
        "role":         invite.role.value,
        "user_exists":  user_exists,
    }
