import uuid
import enum
from sqlalchemy import String, ForeignKey, Enum, Date
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from datetime import date


class StatusEnum(str, enum.Enum):
    todo        = "todo"
    in_progress = "in_progress"
    done        = "done"


class Task(Base):
    __tablename__ = "tasks"

    id:          Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title:       Mapped[str]             = mapped_column(String(255), nullable=False)
    project_id:  Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status:      Mapped[StatusEnum]      = mapped_column(Enum(StatusEnum, name="status_enum"), nullable=False, default=StatusEnum.todo)
    due_date:    Mapped[date | None]     = mapped_column(Date, nullable=True)
