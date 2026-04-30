import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectOut
from app.schemas.member import MemberOut
from app.services import project as project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return project_service.create_project(payload, current_user, db)


@router.get("", response_model=list[ProjectOut])
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return project_service.list_projects(current_user, db)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return project_service.get_project(project_id, current_user, db)


@router.get("/{project_id}/members", response_model=list[MemberOut])
def get_project_members(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return project_service.get_project_members(project_id, current_user, db)
