import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.task import TaskCreate, TaskStatusUpdate, TaskOut
from app.services import task as task_service

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", response_model=TaskOut, status_code=201)
def create_task(
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_service.create_task(payload, current_user, db)


@router.patch("/{task_id}/status", response_model=TaskOut)
def update_task_status(
    task_id: uuid.UUID,
    payload: TaskStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_service.update_task_status(task_id, payload, current_user, db)


@router.get("", response_model=list[TaskOut])
def list_tasks(
    project_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_service.list_tasks(project_id, current_user, db)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_service.get_task(task_id, current_user, db)
