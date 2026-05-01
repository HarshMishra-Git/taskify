import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.project import ProjectMember, Project
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate, TaskOut
from app.services.email_service import send_task_assignment_email


def _get_membership(user_id: uuid.UUID, project_id: uuid.UUID, db: Session) -> ProjectMember | None:
    return db.query(ProjectMember).filter(
        ProjectMember.user_id == user_id,
        ProjectMember.project_id == project_id,
    ).first()


def _notify_assignee(task: Task, db: Session):
    if not task.assigned_to:
        return
    assignee = db.get(User, task.assigned_to)
    project = db.get(Project, task.project_id)
    if assignee:
        try:
            send_task_assignment_email(
                email=assignee.email,
                user_name=assignee.name or assignee.email,
                task_title=task.title,
                project_name=project.name if project else "Project"
            )
        except Exception as e:
            import logging; logging.getLogger(__name__).error("[EMAIL ERROR] %s", e)


def create_task(payload: TaskCreate, current_user: User, db: Session) -> TaskOut:
    if not _get_membership(current_user.id, payload.project_id, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")
    
    # Ensure assignee is a member of the project
    if payload.assigned_to:
        if not _get_membership(payload.assigned_to, payload.project_id, db):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Assignee must be a member of this project"
            )

    task = Task(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)

    # Notify assignee if it's not the creator
    if task.assigned_to and task.assigned_to != current_user.id:
        _notify_assignee(task, db)

    return TaskOut.model_validate(task)


def update_task(task_id: uuid.UUID, payload: TaskUpdate, current_user: User, db: Session) -> TaskOut:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    membership = _get_membership(current_user.id, task.project_id, db)
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a project member")

    from app.models.project import RoleEnum
    # Members can only update tasks assigned to them. Admins have full access.
    if membership.role == RoleEnum.member and task.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Members can only update their own tasks"
        )

    old_assignee = task.assigned_to
    update_data = payload.model_dump(exclude_unset=True)

    # Validate new assignee if being changed
    if "assigned_to" in update_data and update_data["assigned_to"]:
        if not _get_membership(update_data["assigned_to"], task.project_id, db):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="New assignee must be a member of this project"
            )

    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)

    # Notify if assignee changed and it's not the editor
    if task.assigned_to != old_assignee and task.assigned_to and task.assigned_to != current_user.id:
        _notify_assignee(task, db)

    return TaskOut.model_validate(task)


def update_task_status(task_id: uuid.UUID, payload: TaskStatusUpdate, current_user: User, db: Session) -> TaskOut:
    return update_task(task_id, TaskUpdate(status=payload.status), current_user, db)


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
