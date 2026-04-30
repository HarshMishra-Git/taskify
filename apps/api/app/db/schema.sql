-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
CREATE TYPE role_enum   AS ENUM ('admin', 'member');
CREATE TYPE status_enum AS ENUM ('todo', 'in_progress', 'done');

-- TABLES
CREATE TABLE users (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   TEXT         NOT NULL
);

CREATE TABLE projects (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    created_by UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE project_members (
    user_id    UUID       NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    project_id UUID       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role       role_enum  NOT NULL,
    PRIMARY KEY (user_id, project_id)
);

CREATE TABLE tasks (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    project_id  UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assigned_to UUID                  REFERENCES users(id)    ON DELETE SET NULL,
    status      status_enum  NOT NULL DEFAULT 'todo',
    due_date    DATE
);
