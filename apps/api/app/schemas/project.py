import uuid
from datetime import datetime
from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str


class ProjectOut(BaseModel):
    id:         uuid.UUID
    name:       str
    created_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
