"""add verification and invite fields

Revision ID: 0002
Revises: 0001
Create Date: 2024-01-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add verification fields to users
    op.execute("""
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS verification_token TEXT,
            ADD COLUMN IF NOT EXISTS token_expiry      TIMESTAMPTZ
    """)

    # Pending invites for non-existing users
    op.execute("""
        CREATE TABLE IF NOT EXISTS project_invites (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email       VARCHAR(255) NOT NULL,
            project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            role        role_enum NOT NULL DEFAULT 'member',
            token       TEXT NOT NULL UNIQUE,
            token_expiry TIMESTAMPTZ NOT NULL,
            created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            accepted_at TIMESTAMPTZ,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS project_invites")
    op.execute("""
        ALTER TABLE users
            DROP COLUMN IF EXISTS is_verified,
            DROP COLUMN IF EXISTS verification_token,
            DROP COLUMN IF EXISTS token_expiry
    """)
