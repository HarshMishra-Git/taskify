import uuid
from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str


class ProjectOut(BaseModel):
    id:         uuid.UUID
    name:       str
    created_by: uuid.UUID

    model_config = {"from_attributes": True}
