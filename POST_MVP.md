# Post-MVP — Deferred Until Espees Confirms More Than Merchant + Vending

**Status:** Working baseline · **Depends on:** `espees.api.txt`, Doc 16 (Product & Integration
Reconciliation Specification, §28–§32) · **Date:** September 2026

## Context

The only confirmed Espees surfaces are the **Merchant APIs** (product → hosted payment →
confirm) and the **Vending APIs** (create token → vend). There is **no public User API**:
no programmatic account/wallet provisioning, balance, transfers, history, webhooks,
idempotency, or rate-limit documentation. The backend therefore ships a pilot that routes
through merchants (`backend/payments/`), links wallets by claim-and-verify
(`POST /api/v1/wallet/link/` + staff verify), and gates everything else behind
capability flags (`GET /api/v1/wallet/capabilities/`).

Everything below is **deferred, not dropped**. Each item lists its PRD/SRS reference, why it
is blocked, any pilot workaround, and the exact Espees confirmation that promotes it back
into scope. Promotion criteria for every item: capability confirmed in sandbox →
adapter + state handling + tests → capability flag flipped. No flag flips on assumption.

## Deferred capabilities

### 1. Member → member (P2P) transfers — BLOCKED, no technical workaround
- **Refs:** `FR-PAY-001/002`, `SRS-PAY-001..009`, `SRS-TXN-001..004`.
- **Why:** No transfer endpoint exists in the documented API. The backend raises
  `ExternalDependencyPending` (`payments/adapters.py: transfer_user_to_user`) rather than
  inventing one.
- **Pilot workaround:** None clean. Operational two-hop (sender pays a platform merchant
  intent, authorized agent vends to recipient) is possible but carries trust/fee questions —
  pilot decision required before offering it. An internal IOU ledger is explicitly out
  (it would misrepresent platform records as Espees balance, Doc 16 §3).
- **Unblocks when:** Espees documents a user-to-user transfer endpoint (Doc 16 §32 Q8).

### 2. Authoritative balance display — BLOCKED, degraded workaround
- **Refs:** `SRS-ESP-001..003`, wallet functions §11.3 / §9.6.
- **Why:** No balance endpoint. Per `SRS-ESP-002` a cached/inferred number must never be
  presented as authoritative.
- **Pilot workaround:** Show linked address + last-confirmed platform activity + link to the
  Espees portal. `BALANCE_AVAILABLE` stays `False`.
- **Unblocks when:** Read-only balance lookup (even without full User API write access).

### 3. Full transaction history / statements — PARTIAL, platform intents only
- **Refs:** Wallet functions §11.3 (`Transaction history`, `Statements`, `Funding history`).
- **Why:** Only EENP-initiated merchant payments are visible to us; anything the user does
  directly in Espees is invisible without a history API.
- **Pilot workaround:** "Platform activity" ledger (payments + reconciliation records),
  honestly labeled — not called statements.
- **Unblocks when:** User transaction-history endpoint (Doc 16 §32 Q7).

### 4. Withdrawal / redemption to local rails — BLOCKED, manual fallback only
- **Refs:** `FR-WDR-001..004`, `SRS-WDR-001..006`, Doc 16 §16.
- **Why:** No withdrawal/redemption API in the reviewed documentation.
- **Pilot workaround:** Manual reverse-OTC (agent sends fiat after receiving Espees) or defer
  the feature. UI treats it as `COMING / PENDING ENABLEMENT`, never as working.
- **Unblocks when:** Officially supported redemption mechanism (Doc 16 §32 Q9).

### 5. Automated fiat → Espees funding — BLOCKED pending authorization
- **Refs:** `FR-FUND-001..005`, `SRS-FND-001..007`, Doc 16 §15.
- **Why:** The only candidate settlement rail is Vending, which must not be repurposed as a
  generic on-ramp without Espees authorization (`ESPEES_VENDING_ENABLED=False`, interim
  rule §33.5).
- **Pilot workaround:** Manual OTC funding (fiat received off-platform → agent vends to the
  linked user wallet). Viable at pilot scale, operationally heavy at scale.
- **Unblocks when:** Espees authorizes Vending for on-ramp or prescribes the funding path
  (Doc 16 §32 Q10–Q11).

### 6. Programmatic wallet provisioning — REPLACED by claim-and-verify for pilot
- **Refs:** `FR-WAL-001`, `SRS-WAL-001..003`, Doc 16 §7.
- **Why:** No User provisioning/linking API. New accounts correctly stay
  `pending_external` (never a faked active wallet).
- **Pilot workaround (shipped):** `POST /api/v1/wallet/link/` → `requires_action` → staff
  `POST /api/v1/wallet/verify/` → `associated`, verified e.g. against the confirm-response
  `customer_username`.
- **Unblocks when:** User provisioning or official wallet-linking mechanism (Doc 16 §32 Q3–Q5).

### 7. Webhooks / real-time status — POLLING instead
- **Refs:** Doc 16 §25, integration spec webhook model.
- **Why:** No webhook documentation (no events, signatures, or retries).
- **Pilot workaround (shipped):** Confirm-on-return (`GET /api/v1/payments/{id}/return/`) plus
  explicit confirm calls; `PENDING`/`UNKNOWN` age into `REQUIRES_RECONCILIATION`, never
  silently into success/failure.
- **Unblocks when:** Webhook support confirmed (Doc 16 §32 Q12), then add endpoint +
  signature validation + idempotent handler.

### 8. User payment requests / QR identifiers — DEFERRED (needs P2P)
- **Refs:** PRD §10.2, §10.5, wallet functions (`Payment requests`).
- **Why:** A request record is trivial; *settling* it member-to-member needs item 1.
- **Pilot workaround:** Requests payable via merchant flow only (payee must be an onboarded
  merchant); pure P2P requests stay disabled.
- **Unblocks when:** Item 1 unblocks.

### 9. Platform idempotency / rate-limit alignment — PLATFORM-SIDE only
- **Refs:** `SRS-TXN-001/002`, `SRS-PAY-008`.
- **Why:** Espees documents no idempotency keys or rate limits, so end-to-end exactly-once
  cannot be proven.
- **Pilot workaround (shipped):** Platform-side idempotency (`Payment.idempotency_key`),
  single-use vending-hash tracking (to be built with rec 5), conservative confirm retry.
- **Unblocks when:** Official idempotency + rate-limit documentation (Doc 16 §32 Q13–Q14).

## Pilot scope (for contrast — ships without the User API)

Merchant P2B/B2B payments with server-side confirmation · contribution-via-merchant
(to be linked to campaigns) · claim-and-verify wallets · capability-gated Wallet UI ·
marketplace, orders, messaging, campaigns (records), trust, discovery · audit +
reconciliation records · `user_data` join keys, full confirm-payload persistence, amount
guard, per-payment return URLs (all in `backend/payments/`).

## Minimum Espees asks, in priority order

1. Production Merchant API access (key + merchant wallet) — launch-blocking.
2. Vending-for-onramp authorization or prescribed funding path — funding-blocking.
3. Rate limits + production onboarding + support contact.
4. Smaller-than-User-API wins: read-only wallet-exists/balance lookup, history lookup,
   webhook or status-callback. Full 15-question set: Doc 16 §32.
