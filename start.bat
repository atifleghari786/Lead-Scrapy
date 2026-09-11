@echo off
echo Starting Lead Console...
echo.

if not exist "backend\.env" (
    echo .env file missing — creating it from .env.example...
    copy backend\.env.example backend\.env
    echo Done.
    echo.
)

docker compose up --build
