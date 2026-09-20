# Espees Economic Network Platform — backend

## Development (venv)

Requires Python 3.12+.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # adjust as needed
python manage.py migrate
python manage.py runserver
```

If `.env` is missing, defaults are suitable for local development (DEBUG=True).

## Production (Docker)

Build and run the backend container:

```bash
cd backend
cp .env.example .env   # set real values
docker compose -f docker-compose.yaml up --build -d
```

On startup the container runs migrations and `collectstatic`, then serves the app with gunicorn.

## API

- Health check: `GET /api/v1/health/`
- Admin: `GET /admin/`

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `DEBUG` | Django debug mode | `False` |
| `SECRET_KEY` | Django signing secret | dev-only default |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `*` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | empty |
| `FRONTEND_URL` | Frontend URL for links | `http://localhost:8081` |