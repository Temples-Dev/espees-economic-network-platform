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

Authentication uses JWT (simplejwt). Protected endpoints expect `Authorization: Bearer <access>`.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register/` | Create a member account (auto-provisions a wallet reference) |
| `POST` | `/api/v1/auth/login/` | Obtain access + refresh tokens |
| `POST` | `/api/v1/auth/refresh/` | Refresh an access token |
| `GET` | `/api/v1/me/` | Current member profile + wallet (auth required) |
| `GET` | `/api/v1/businesses/` | Business discovery (public) — filters: `search`, `category` |
| `GET` | `/api/v1/businesses/{id}/` | Business detail incl. owner + admins (public) |
| `POST` | `/api/v1/businesses/` | Create a business (auth required; creator becomes owner) |
| `PATCH` | `/api/v1/businesses/{id}/` | Update a business (owner/admin only) |
| `DELETE` | `/api/v1/businesses/{id}/` | Delete a business (owner only) |
| `POST` | `/api/v1/businesses/{id}/members/` | Add an admin by email (owner/admin only) |
| `GET` | `/api/v1/categories/` | Business categories (public) |
| `GET` | `/api/v1/health/` | Service health |
| `GET` | `/admin/` | Django admin |

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `DEBUG` | Django debug mode | `False` |
| `SECRET_KEY` | Django signing secret | dev-only default |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `*` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | empty |
| `FRONTEND_URL` | Frontend URL for links | `http://localhost:8081` |