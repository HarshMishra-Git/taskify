"""initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("DO $$ BEGIN CREATE TYPE role_enum AS ENUM ('admin', 'member'); EXCEPTION WHEN duplicate_object THEN null; END $$")
    op.execute("DO $$ BEGIN CREATE TYPE status_enum AS ENUM ('todo', 'in_progress', 'done'); EXCEPTION WHEN duplicate_object THEN null; END $$")
    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name     VARCHAR(100) NOT NULL,
            email    VARCHAR(255) NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name       VARCHAR(255) NOT NULL,
            created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS project_members (
            user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
            project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            role       role_enum NOT NULL,
            PRIMARY KEY (user_id, project_id)
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title       VARCHAR(255) NOT NULL,
            project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
            status      status_enum NOT NULL DEFAULT 'todo',
            due_date    DATE
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS tasks")
    op.execute("DROP TABLE IF EXISTS project_members")
    op.execute("DROP TABLE IF EXISTS projects")
    op.execute("DROP TABLE IF EXISTS users")
    op.execute("DROP TYPE IF EXISTS status_enum")
    op.execute("DROP TYPE IF EXISTS role_enum")
