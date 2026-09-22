import { api } from "./api";

/** Espees wallet association (Doc16 section 8). Balances are authoritative
 *  in Espees only — this record is the platform-side association. */
export type WalletAssociation = {
  id: string;
  espees_wallet_id: string;
  espees_wallet_address: string;
  external_account_reference: string;
  status: string;
  status_detail: string;
  metadata: Record<string, unknown>;
  provisioned_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Capability-driven flags (Doc16 section 25.6). Unavailable means
 *  "pending enablement", never a broken feature. */
export type Capabilities = {
  BALANCE_AVAILABLE: boolean;
  FUNDING_AVAILABLE: boolean;
  PAYMENT_AVAILABLE: boolean;
  RECEIVING_AVAILABLE: boolean;
  WITHDRAWAL_AVAILABLE: boolean;
  wallet_status: string | null;
  wallet_ready: boolean;
  merchant_configured: boolean;
};

export type Payment = {
  id: string;
  operation_type: string;
  product_sku: string;
  narration: string;
  amount_espees: string;
  merchant_wallet: string;
  success_url: string;
  fail_url: string;
  user_data: Record<string, unknown>;
  idempotency_key: string;
  correlation_id: string;
  espees_payment_ref: string;
  external_status: string;
  customer_username: string;
  status_details: string;
  transaction_date_raw: string;
  status: string;
  status_detail: string;
  confirmed_at: string | null;
  payment_url: string;
  created_at: string;
  updated_at: string;
};

export async function getWallet(): Promise<{ wallet: WalletAssociation; capabilities: Capabilities }> {
  return api.get("/api/v1/wallet/");
}

export async function getCapabilities(): Promise<Capabilities> {
  return api.get("/api/v1/wallet/capabilities/");
}

export async function linkWallet(address: string): Promise<WalletAssociation> {
  return api.post("/api/v1/wallet/link/", { espees_wallet_address: address });
}

export async function listPayments(): Promise<Payment[]> {
  return api.getList<Payment>("/api/v1/payments/");
}

export async function getPayment(id: string): Promise<Payment> {
  return api.get(`/api/v1/payments/${id}/`);
}

export async function createMerchantPayment(input: {
  narration: string;
  amount_espees: string;
  product_sku?: string;
  idempotency_key?: string;
  user_data?: Record<string, unknown>;
}): Promise<Payment> {
  return api.post("/api/v1/payments/merchant/", input);
}

export async function confirmPayment(id: string): Promise<Payment> {
  return api.post(`/api/v1/payments/${id}/confirm/`, {});
}

export function newIdempotencyKey(): string {
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
