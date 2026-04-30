from datetime import date
from sqlalchemy.orm import Session
from app.models.task import Task, StatusEnum
from app.models.user import User


def get_dashboard(current_user: User, db: Session) -> dict:
    from app.models.project import ProjectMember

    # All tasks assigned to current user across all projects
    assigned = db.query(Task).filter(Task.assigned_to == current_user.id).all()

    by_status = {s.value: 0 for s in StatusEnum}
    overdue   = []
    today     = date.today()

    for task in assigned:
        by_status[task.status.value] += 1
        if task.due_date and task.due_date < today and task.status != StatusEnum.done:
            overdue.append(task)

    # Also include overdue tasks in user's projects where assigned_to is null (unassigned)
    # so admins can see project-wide overdue tasks too
    member_project_ids = [
        row.project_id for row in
        db.query(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()
    ]
    unassigned_overdue = db.query(Task).filter(
        Task.project_id.in_(member_project_ids),
        Task.assigned_to == None,  # noqa: E711
        Task.due_date < today,
        Task.status != StatusEnum.done,
    ).all()

    all_overdue = {t.id: t for t in overdue}
    for t in unassigned_overdue:
        all_overdue[t.id] = t

    return {
        "total":     len(assigned),
        "by_status": by_status,
        "overdue": [
            {
                "id":         str(t.id),
                "title":      t.title,
                "project_id": str(t.project_id),
                "due_date":   t.due_date.isoformat(),
                "status":     t.status.value,
            }
            for t in all_overdue.values()
        ],
    }
