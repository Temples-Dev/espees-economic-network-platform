import { api } from "./api";

export type Business = {
  id: string;
  name: string;
  category?: string | null;
  description: string;
  location: string;
  verification_status: string;
  average_rating?: number | null;
  review_count?: number;
  created_at: string;
};

export type Offering = {
  id: string;
  business: string;
  kind: string;
  name: string;
  description: string;
  price: string;
  is_active: boolean;
};

export type OrderItem = {
  offering_name?: string;
  quantity: number;
  unit_price: string;
  line_total: string;
};

export type Order = {
  id: string;
  business_name?: string;
  business?: string;
  status: string;
  total: string;
  items?: OrderItem[];
  created_at: string;
};

export type Campaign = {
  id: string;
  title: string;
  description: string;
  purpose: string;
  goal_espees: string;
  raised_espees?: string | null;
  contribution_count?: number;
  status: string;
  end_date: string | null;
  created_at: string;
};

export async function listBusinesses(search = ""): Promise<Business[]> {
  const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return api.getList<Business>(`/api/v1/businesses/${q}`);
}

export async function getBusiness(id: string): Promise<Business> {
  return api.get(`/api/v1/businesses/${id}/`);
}

export async function listOfferings(businessId: string): Promise<Offering[]> {
  const [products, services] = await Promise.all([
    api.getList<Offering>(`/api/v1/products/?business=${businessId}`),
    api.getList<Offering>(`/api/v1/services/?business=${businessId}`),
  ]);
  return [...products, ...services];
}

export async function listOrders(): Promise<Order[]> {
  return api.getList<Order>("/api/v1/orders/");
}

export async function createOrder(
  businessId: string,
  items: Array<{ offering: string; quantity: number }>,
): Promise<Order> {
  return api.post("/api/v1/orders/", { business: businessId, items });
}

export async function listCampaigns(): Promise<Campaign[]> {
  return api.getList<Campaign>("/api/v1/campaigns/");
}

export async function getCampaign(id: string): Promise<Campaign> {
  return api.get(`/api/v1/campaigns/${id}/`);
}

export async function contributeToCampaign(
  id: string,
  amount_espees: string,
  note = "",
): Promise<unknown> {
  return api.post(`/api/v1/campaigns/${id}/contribute/`, { amount_espees, note });
}
