import uuid
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.project import RoleEnum, ProjectMember
from app.models.user import User
from app.schemas.member import MemberAdd, MemberOut
from app.services import member as member_service

from app.dependencies.permissions import CheckProjectRole


router = APIRouter(prefix="/projects", tags=["members"])


class AddMemberByEmailRequest(BaseModel):
    email: EmailStr
    role:  RoleEnum = RoleEnum.member


@router.post("/{project_id}/members", response_model=MemberOut, status_code=201)
def add_member(
    project_id: uuid.UUID,
    payload: MemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: ProjectMember = Depends(CheckProjectRole(RoleEnum.admin)),
):
    return member_service.add_member(project_id, payload, current_user, db)


@router.post("/{project_id}/invite", status_code=201)
def invite_member_by_email(
    project_id: uuid.UUID,
    payload: AddMemberByEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: ProjectMember = Depends(CheckProjectRole(RoleEnum.admin)),
):
    return member_service.add_member_by_email(project_id, payload.email, payload.role, current_user, db)


@router.delete("/{project_id}/members/{user_id}", status_code=204)
def remove_member(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: ProjectMember = Depends(CheckProjectRole(RoleEnum.admin)),
):
    member_service.remove_member(project_id, user_id, current_user, db)


@router.delete("/{project_id}/invites", status_code=204)
def revoke_invite(
    project_id: uuid.UUID,
    email: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: ProjectMember = Depends(CheckProjectRole(RoleEnum.admin)),
):
    member_service.revoke_invite(project_id, email, current_user, db)


@router.post("/invites/accept")
def accept_invite(
    token: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return member_service.accept_invite(token, current_user, db)


@router.get("/invites/info")
def get_invite_info(
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    return member_service.get_invite_info(token, db)
