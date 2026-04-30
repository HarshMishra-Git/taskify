import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id:                   Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name:                 Mapped[str]            = mapped_column(String(100), nullable=False)
    email:                Mapped[str]            = mapped_column(String(255), nullable=False, unique=True)
    password:             Mapped[str]            = mapped_column(Text, nullable=False)
    is_verified:          Mapped[bool]           = mapped_column(Boolean, nullable=False, default=False)
    verification_token:   Mapped[str | None]     = mapped_column(Text, nullable=True)
    token_expiry:         Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
