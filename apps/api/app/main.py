from fastapi import FastAPI
from app.routes import auth, projects, tasks, members, dashboard, users

app = FastAPI(title="Taskify")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(members.router)
app.include_router(dashboard.router)
