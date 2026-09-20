# Espees Economic Network Platform

A mobile-first digital ecosystem that makes **Espees** a practical medium of everyday economic activity across the LoveWorld Nation.

Espees provides the currency and underlying financial infrastructure. This platform builds the economic ecosystem around it: the people, businesses, services, transactions, opportunities, projects, funding and conversations that give the currency practical utility.

> The application is not creating another currency. It is creating an economic ecosystem around the existing Espees currency and integrating with the Espees infrastructure through its API.

## Vision

> Build the digital economic network of the LoveWorld Nation, where Espees is the native currency through which members transact, businesses grow, ideas are funded, and economic relationships are formed.

## Core Capabilities

- Personal and business Espees wallets (provisioned automatically with every account)
- Local-currency funding and withdrawal via local payment gateways
- Person-to-person, person-to-business and business-to-business payments
- Business, product, service, supplier and opportunity discovery
- B2B commerce: procurement, quotes, orders and supplier relationships
- Community funding and crowdfunding with milestones and transparency
- Contextual communication tied to economic activity
- Reputation and trust signals
- Intelligent search and matching

## Product Areas

| Area | Purpose |
| --- | --- |
| **Home** | Personal economic dashboard — balance, activity, recommendations, opportunities |
| **Discover** | Discovery of businesses, products, services, suppliers, projects and campaigns |
| **Pay** | Universal Espees transaction interface across member and business relationships |
| **Build** | Business creation, management, supplier and customer discovery, campaign creation |
| **Community** | Contextual messaging and conversations around economic objects |
| **Wallet** | Espees balance, funding, withdrawal, transaction history and statements |

## Architecture Principle

The platform is **not the authoritative ledger for Espees**. Espees remains the source of truth for balances and transactions. The platform acts as the **economic experience and orchestration layer** on top.

```
PLATFORM
  ├── Economic Layer (identity, discovery, commerce, community, funding, intelligence)
  └── Espees API ──> Espees Network
```

Local payment gateways (mobile money, bank rails) are implemented behind an abstraction layer so the platform stays geographically extensible without coupling business logic to individual providers.

## Roadmap

| Phase | Focus |
| --- | --- |
| **0 — Foundation** | Identity, accounts, automatic wallet, Espees API integration, local gateway abstraction |
| **1 — Economy** | Wallet, funding, withdrawal, P2P payments, business profiles, discovery, business payments, messaging |
| **2 — Commerce** | Products, services, orders, B2B, suppliers, quotes, opportunities |
| **3 — Community Capital** | Campaigns, contributions, milestones, transparency, disbursement |
| **4 — Intelligence** | Semantic search, smart matching, recommendations, opportunity matching, economic insights |

## Documentation

This repository contains the product documentation suite, starting with the **Product Vision & Strategy** master document (`PVS-001`), which serves as the source of truth for the subsequent PRD, SRS, architecture, Espees integration, gateway, marketplace, funding and AI specifications.

## Repository Structure

```
Qubators AI Foundary 2.0_  Espees Product.md   # Product documentation suite (PVS-001 + drafts)
mobile/                                        # Mobile app — React Native + Expo (SDK 57)
  ├── src/app/                                 # expo-router file-based routing
  ├── src/components/                          # Reusable UI components
  ├── src/constants/                           # Theme and app constants
  └── src/hooks/                               # Shared hooks
backend/                                       # API — Django 6 + Django REST Framework
  ├── config/                                  # Project settings, URLs, WSGI
  ├── core/                                    # Core app (health check)
  ├── Dockerfile + docker-compose.yaml         # Production container (gunicorn)
  └── entrypoint.sh                            # migrate + collectstatic + serve
README.md                                      # This file
```

## Backend (Django API)

The API is built with **Django 6 + Django REST Framework**, packaged for production in Docker and served with gunicorn.

### Development (venv)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # defaults work for local dev
python manage.py migrate
python manage.py runserver   # http://localhost:8000
```

### Production (Docker)

```bash
cd backend
cp .env.example .env   # set real values
docker compose -f docker-compose.yaml up --build -d
```

### Endpoints

- Health check: `GET /api/v1/health/`
- Admin: `GET /admin/`

## Mobile App

The mobile application is built with **React Native + Expo (SDK 57) + TypeScript**, using expo-router for file-based navigation. React 19 with the React Compiler and typed routes are enabled.

```bash
cd mobile
pnpm install        # install dependencies
pnpm start          # start the Expo dev server
pnpm run android    # launch on Android (or Expo Go)
pnpm run ios        # launch on iOS (macOS + Expo Go)
pnpm run web        # run in the browser
```

Use `expo start` to run on a physical device via the Expo Go app — no simulator required.

## Status

**Draft — Strategic Baseline.** Documentation phase. Product vision and strategy established; engineering specifications and implementation to follow.

## License

All rights reserved.