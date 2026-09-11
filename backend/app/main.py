from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import (
    routes_auth,
    routes_jobs,
    routes_leads,
    routes_templates,
    routes_export,
    routes_usage,
    routes_admin,
    routes_billing,
    routes_team,
)

app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # tighten to real frontend domain(s) in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_auth.router)
app.include_router(routes_jobs.router)
app.include_router(routes_leads.router)
app.include_router(routes_templates.router)
app.include_router(routes_export.router)
app.include_router(routes_usage.router)
app.include_router(routes_admin.router)
app.include_router(routes_billing.router)
app.include_router(routes_team.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
