import uuid
from pydantic import BaseModel
from app.models.project import RoleEnum


class MemberAdd(BaseModel):
    user_id: uuid.UUID
    role:    RoleEnum


class MemberOut(BaseModel):
    user_id:    uuid.UUID | None = None
    project_id: uuid.UUID
    role:       RoleEnum
    name:       str | None = None
    email:      str | None = None
    pending:    bool = False

    model_config = {"from_attributes": True}
