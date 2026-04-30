import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from app.models.project import RoleEnum


class ProjectInvite(Base):
    __tablename__ = "project_invites"

    id:           Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email:        Mapped[str]            = mapped_column(String(255), nullable=False)
    project_id:   Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    role:         Mapped[RoleEnum]       = mapped_column(Enum(RoleEnum, name="role_enum", create_type=False), nullable=False, default=RoleEnum.member)
    token:        Mapped[str]            = mapped_column(String, nullable=False, unique=True)
    token_expiry: Mapped[datetime]       = mapped_column(DateTime(timezone=True), nullable=False)
    created_by:   Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    accepted_at:  Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at:   Mapped[datetime]       = mapped_column(DateTime(timezone=True), nullable=False)
