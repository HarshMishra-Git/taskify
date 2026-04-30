import uuid
from datetime import date
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.task import Task, StatusEnum
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.task import TaskCreate, TaskStatusUpdate, TaskOut


def _get_membership(user_id: uuid.UUID, project_id: uuid.UUID, db: Session) -> ProjectMember | None:
    return db.query(ProjectMember).filter(
        ProjectMember.user_id == user_id,
        ProjectMember.project_id == project_id,
    ).first()


def create_task(payload: TaskCreate, current_user: User, db: Session) -> TaskOut:
    if not _get_membership(current_user.id, payload.project_id, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")
    task = Task(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return TaskOut.model_validate(task)


def update_task_status(task_id: uuid.UUID, payload: TaskStatusUpdate, current_user: User, db: Session) -> TaskOut:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    membership = _get_membership(current_user.id, task.project_id, db)
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")

    from app.models.project import RoleEnum
    if membership.role == RoleEnum.member and task.assigned_to != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Members can only update their own tasks")

    task.status = payload.status
    db.commit()
    db.refresh(task)
    return TaskOut.model_validate(task)


def list_tasks(project_id: uuid.UUID, current_user: User, db: Session) -> list[TaskOut]:
    if not _get_membership(current_user.id, project_id, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    return [TaskOut.model_validate(t) for t in tasks]


def get_task(task_id: uuid.UUID, current_user: User, db: Session) -> TaskOut:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not _get_membership(current_user.id, task.project_id, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")
    return TaskOut.model_validate(task)
