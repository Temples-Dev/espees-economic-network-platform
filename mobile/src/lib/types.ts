export type User = {
  id: string;
  email: string;
  full_name: string;
  is_verified: boolean;
  wallet: { espees_wallet_id: string; status: string } | null;
};

export type RegisterPayload = {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
};

export type Session = {
  device_key: string | null;
  ip_address: string | null;
  user_agent: string;
  created_at: string;
};
