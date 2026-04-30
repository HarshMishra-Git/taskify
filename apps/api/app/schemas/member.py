import uuid
from pydantic import BaseModel
from app.models.project import RoleEnum


class MemberAdd(BaseModel):
    user_id: uuid.UUID
    role:    RoleEnum


class MemberOut(BaseModel):
    user_id:    uuid.UUID
    project_id: uuid.UUID
    role:       RoleEnum
    name:       str | None = None
    email:      str | None = None

    model_config = {"from_attributes": True}
