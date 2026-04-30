import uuid
from datetime import date
from pydantic import BaseModel
from app.models.task import StatusEnum


class TaskCreate(BaseModel):
    title:       str
    project_id:  uuid.UUID
    assigned_to: uuid.UUID | None = None
    due_date:    date | None      = None


class TaskStatusUpdate(BaseModel):
    status: StatusEnum


class TaskOut(BaseModel):
    id:          uuid.UUID
    title:       str
    project_id:  uuid.UUID
    assigned_to: uuid.UUID | None
    status:      StatusEnum
    due_date:    date | None

    model_config = {"from_attributes": True}
