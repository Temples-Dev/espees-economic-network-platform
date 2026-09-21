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
| `GET` | `/api/v1/businesses/` | Business discovery (public) — filters: `search`, `category`, `verified=true`, `mine=true`, `near=lat,lng` (+`radius_km`, default 25; adds `distance_km`), `sort=name\|-name\|newest\|rating`. Images: `logo`, `cover_image` (multipart PATCH, max 5 MB) |
| `GET` | `/api/v1/businesses/{id}/` | Business detail incl. owner + admins (public) |
| `POST` | `/api/v1/businesses/` | Create a business (auth required; creator becomes owner) |
| `PATCH` | `/api/v1/businesses/{id}/` | Update a business (owner/admin only) |
| `DELETE` | `/api/v1/businesses/{id}/` | Delete a business (owner only) |
| `POST` | `/api/v1/businesses/{id}/members/` | Add an admin by email (owner/admin only) |
| `GET` | `/api/v1/categories/` | Business categories (public) |
| `GET` | `/api/v1/products/` · `/api/v1/services/` | Offerings (public) — filters: `search`, `category`, `business`, `min_price`, `max_price`, `sort=price\|-price\|newest`; optional `image` upload |
| `POST` | `/api/v1/products/` · `/api/v1/services/` | Create an offering (business member only) |
| `PATCH` | `/api/v1/products/{id}/` · `/api/v1/services/{id}/` | Update an offering (business member only) |
| `GET` | `/api/v1/products/mine/` | Offerings of businesses you manage |
| `GET` | `/api/v1/orders/` | Your orders (or a business's, with `?business=` if you manage it) |
| `POST` | `/api/v1/orders/` | Create an order from offerings of one business (computed totals) |
| `PATCH` | `/api/v1/orders/{id}/status/` | Move an order: business pending→confirmed→fulfilled (or cancelled while pending/confirmed); the customer may cancel only while pending. Invalid transitions are 400. `GET /orders/?status=` filters |
| `GET` | `/api/v1/reviews/` | Reviews (public) — filters: `business`, `offering`, `reviewer` |
| `POST` | `/api/v1/reviews/` | Review a business or offering, rating 1–5 (one per target) |
| `PATCH` | `/api/v1/reviews/{id}/` | Edit your review (author only) |
| `GET` | `/api/v1/conversations/` | Your message threads (ordered by last message, with `unread_count`) |
| `POST` | `/api/v1/conversations/` | Start a thread (`other_party`, optional `order`/`business`/`campaign` context; one thread per pair per context) |
| `GET` | `/api/v1/conversations/{id}/` | Thread detail with last 100 messages (participants only) |
| `POST` | `/api/v1/conversations/{id}/messages/` | Send a message (participants only) |
| `POST` | `/api/v1/conversations/{id}/read/` | Mark incoming messages as read |
| `GET` | `/api/v1/supplier-requests/` | Supplier requests (public) — filters: `status`, `category` |
| `POST` | `/api/v1/supplier-requests/` | Create a request (requester business member only) |
| `GET` | `/api/v1/supplier-requests/{id}/` | Detail with all quotes (`accepted_quote`, `quote_count`) |
| `PATCH` | `/api/v1/supplier-requests/{id}/` | Update / close a request (requester business member only) |
| `GET` | `/api/v1/quotes/` | Quotes (public) — filter: `request` |
| `POST` | `/api/v1/quotes/` | Submit a quote on an open request (supplier business member, not your own request) |
| `POST` | `/api/v1/quotes/{id}/accept/` | Accept a quote; closes the request and declines the rest |
| `GET` | `/api/v1/campaigns/` | Campaigns (drafts visible to creator) |
| `POST` | `/api/v1/campaigns/` | Create a campaign as a draft |
| `POST` | `/api/v1/campaigns/{id}/submit/` · `/cancel/` · `/complete/` | Lifecycle transitions (creator only) |
| `POST` | `/api/v1/campaigns/{id}/contribute/` | Contribute Espees (any member except the creator; auto-completes at goal) |
| `POST` | `/api/v1/campaigns/{id}/updates/` · `/milestones/` | Post an update / add a milestone (creator only) |
| `GET` | `/api/v1/campaigns/{id}/` | Transparency: `raised_espees`, `contribution_count`, `disbursed_espees`, milestones, updates |
| `PATCH` | `/api/v1/campaign-milestones/{id}/` | Mark a milestone achieved/disbursed (creator only) |
| `GET` | `/api/v1/notifications/` | Your in-app notifications — filter: `unread=true` |
| `POST` | `/api/v1/notifications/{id}/read/` · `/read-all/` | Mark notification(s) read |
| `GET`/`PATCH` | `/api/v1/notification-preferences/` | Channel toggles (`in_app`, `email`, `push`, `sms`) |
| `POST` | `/api/v1/devices/` · `DELETE` same | Register / remove this device's push token (`token`, `platform`: ios/android) |
| `GET` | `/api/v1/search/?q=` | Plain-language search across businesses, products and services; returns `interpreted` keywords, place and category. `limit` caps each group |
| `POST` | `/api/v1/auth/verify-email/request/` | Email the signed-in member a verification link |
| `POST` | `/api/v1/auth/verify-email/confirm/` | Confirm with `{token}`; sets `is_verified` |
| `GET`/`POST` | `/api/v1/businesses/{id}/verification/` | Read the latest / apply for business verification (multipart: `legal_name`, `registration_number`, `document`, `notes`); staff approve or reject in admin |
| `GET`/`POST` | `/api/v1/disputes/` · `GET /disputes/{id}/` | Disputes on orders you are party to (customer or business admin). Open with `order`, `reason` (`not_received`, `not_as_described`, `wrong_amount`, `other`), `description`; only confirmed/fulfilled orders, one open dispute per order. Filters `status`, `order`. No edit/delete: staff resolve in admin (outcome recorded, both parties notified) |
| `GET` | `/api/v1/health/` | Service health |
| `GET` | `/admin/` | Django admin: verification requests, disputes and a read-only audit log (order status changes, verification decisions, disputes, business admins added, security events) |

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `DEBUG` | Django debug mode | `False` |
| `SECRET_KEY` | Django signing secret | dev-only default |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `*` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | empty |
| `AUTH_THROTTLE_RATE` | Per-IP limit on sign-in, sign-up, reset and verification endpoints | `20/min` |
| `FRONTEND_URL` | Frontend URL for links | `http://localhost:8081` |