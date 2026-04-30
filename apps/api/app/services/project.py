import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.project import Project, ProjectMember, RoleEnum
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectOut
from app.schemas.member import MemberOut


def create_project(payload: ProjectCreate, current_user: User, db: Session) -> ProjectOut:
    project = Project(name=payload.name, created_by=current_user.id)
    db.add(project)
    db.flush()
    member = ProjectMember(user_id=current_user.id, project_id=project.id, role=RoleEnum.admin)
    db.add(member)
    db.commit()
    db.refresh(project)
    return ProjectOut.model_validate(project)


def list_projects(current_user: User, db: Session) -> list[ProjectOut]:
    rows = (
        db.query(Project)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .filter(ProjectMember.user_id == current_user.id)
        .all()
    )
    return [ProjectOut.model_validate(p) for p in rows]


def _require_membership(user_id: uuid.UUID, project_id: uuid.UUID, db: Session) -> None:
    member = db.query(ProjectMember).filter(
        ProjectMember.user_id == user_id,
        ProjectMember.project_id == project_id,
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")


def get_project(project_id: uuid.UUID, current_user: User, db: Session) -> ProjectOut:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    _require_membership(current_user.id, project_id, db)
    return ProjectOut.model_validate(project)


def get_project_members(project_id: uuid.UUID, current_user: User, db: Session) -> list[MemberOut]:
    from app.models.invite import ProjectInvite
    from datetime import datetime, timezone

    if not db.get(Project, project_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    _require_membership(current_user.id, project_id, db)

    # Active members
    rows = (
        db.query(ProjectMember, User)
        .join(User, User.id == ProjectMember.user_id)
        .filter(ProjectMember.project_id == project_id)
        .all()
    )
    result = [
        MemberOut(
            user_id=pm.user_id,
            project_id=pm.project_id,
            role=pm.role,
            name=u.name,
            email=u.email,
            pending=False,
        )
        for pm, u in rows
    ]

    # Pending invites — users who don't have an account yet (not accepted, not expired)
    active_emails = {u.email for _, u in rows}
    pending_invites = (
        db.query(ProjectInvite)
        .filter(
            ProjectInvite.project_id == project_id,
            ProjectInvite.accepted_at == None,  # noqa: E711
            ProjectInvite.token_expiry > datetime.now(timezone.utc),
        )
        .all()
    )
    seen_pending = set()
    for inv in pending_invites:
        if inv.email not in active_emails and inv.email not in seen_pending:
            seen_pending.add(inv.email)
            result.append(MemberOut(
                user_id=None,
                project_id=inv.project_id,
                role=inv.role,
                name=None,
                email=inv.email,
                pending=True,
            ))

    return result
