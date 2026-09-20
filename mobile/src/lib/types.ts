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

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type MemberSummary = {
  id: string;
  email: string;
  full_name: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Business = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string | null;
  location: string;
  contact_email: string;
  average_rating: number | null;
  review_count: number;
};

export type Offering = {
  id: string;
  business: string;
  business_name: string;
  kind: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  average_rating: number | null;
  review_count: number;
  is_active: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  customer_email: string;
  business: string;
  business_name: string;
  status: string;
  total: string;
  items: unknown[];
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  initiator: MemberSummary;
  other_party: MemberSummary;
  business: string | null;
  business_name: string | null;
  order: string | null;
  order_id: string | null;
  campaign: string | null;
  campaign_title: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
};

export type Campaign = {
  id: string;
  creator: MemberSummary | null;
  business: string | null;
  business_name: string | null;
  title: string;
  description: string;
  purpose: string;
  goal_espees: string;
  end_date: string;
  status: string;
  raised_espees: string | number | null;
  contribution_count: number;
};

export type AppNotification = {
  id: string;
  category: string;
  title: string;
  message: string;
  target_type: string | null;
  target_id: string | null;
  read_at: string | null;
  is_read: boolean;
  created_at: string;
};

export type SupplierRequest = {
  id: string;
  requesting_business: string;
  requesting_business_name: string;
  category: string | null;
  category_name: string | null;
  title: string;
  description: string;
  quantity: string | number | null;
  budget_espees: string | number | null;
  status: string;
  quote_count: number;
};
