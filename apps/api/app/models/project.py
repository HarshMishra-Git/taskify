import uuid
from datetime import datetime
import enum
from sqlalchemy import String, ForeignKey, Enum, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class RoleEnum(str, enum.Enum):
    admin  = "admin"
    member = "member"


class Project(Base):
    __tablename__ = "projects"

    id:         Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name:       Mapped[str]       = mapped_column(String(255), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), nullable=False, server_default="now()")


class ProjectMember(Base):
    __tablename__ = "project_members"

    user_id:    Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id",    ondelete="CASCADE"), primary_key=True)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    role:       Mapped[RoleEnum]  = mapped_column(Enum(RoleEnum, name="role_enum"), nullable=False)
