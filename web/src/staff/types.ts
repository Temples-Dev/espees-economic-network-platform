export type Category = { id: string; name: string; slug: string };

export type Order = {
  id: string;
  customer_email: string;
  business_name: string;
  status: string;
  total: string;
  created_at: string;
};

export type SessionRow = {
  device_key: string | null;
  ip_address: string | null;
  user_agent: string;
  created_at: string;
};

export type Notice = { id: string; title: string; message: string; is_read: boolean };

export type WalletRow = {
  id: string;
  user_id: string;
  user_email: string;
  espees_wallet_address: string;
  external_account_reference: string;
  status: string;
  status_detail: string;
  provisioned_at: string | null;
  updated_at: string;
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
