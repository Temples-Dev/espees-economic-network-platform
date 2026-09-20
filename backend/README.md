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
| `GET` | `/api/v1/products/` · `/api/v1/services/` | Offerings (public) — filters: `search`, `category`, `business` |
| `POST` | `/api/v1/products/` · `/api/v1/services/` | Create an offering (business member only) |
| `PATCH` | `/api/v1/products/{id}/` · `/api/v1/services/{id}/` | Update an offering (business member only) |
| `GET` | `/api/v1/products/mine/` | Offerings of businesses you manage |
| `GET` | `/api/v1/orders/` | Your orders (or a business's, with `?business=` if you manage it) |
| `POST` | `/api/v1/orders/` | Create an order from offerings of one business (computed totals) |
| `PATCH` | `/api/v1/orders/{id}/status/` | Update order status (business member only) |
| `GET` | `/api/v1/reviews/` | Reviews (public) — filters: `business`, `offering`, `reviewer` |
| `POST` | `/api/v1/reviews/` | Review a business or offering, rating 1–5 (one per target) |
| `PATCH` | `/api/v1/reviews/{id}/` | Edit your review (author only) |
| `GET` | `/api/v1/conversations/` | Your message threads (ordered by last message, with `unread_count`) |
| `POST` | `/api/v1/conversations/` | Start a thread (`other_party`, optional `order`/`business` context; direct threads are reused) |
| `GET` | `/api/v1/conversations/{id}/` | Thread detail with last 100 messages (participants only) |
| `POST` | `/api/v1/conversations/{id}/messages/` | Send a message (participants only) |
| `POST` | `/api/v1/conversations/{id}/read/` | Mark incoming messages as read |
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