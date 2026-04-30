from datetime import date
from sqlalchemy.orm import Session
from app.models.task import Task, StatusEnum
from app.models.user import User


def get_dashboard(current_user: User, db: Session) -> dict:
    assigned = db.query(Task).filter(Task.assigned_to == current_user.id).all()

    by_status = {s.value: 0 for s in StatusEnum}
    overdue = []

    today = date.today()
    for task in assigned:
        by_status[task.status.value] += 1
        if task.due_date and task.due_date < today and task.status != StatusEnum.done:
            overdue.append(task)

    return {
        "total":    len(assigned),
        "by_status": by_status,
        "overdue":  [
            {
                "id":         str(t.id),
                "title":      t.title,
                "project_id": str(t.project_id),
                "due_date":   t.due_date.isoformat(),
                "status":     t.status.value,
            }
            for t in overdue
        ],
    }
