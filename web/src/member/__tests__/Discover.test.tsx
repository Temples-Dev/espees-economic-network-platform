import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Discover } from "../Discover";

const { mockListBusinesses, mockListOfferings, mockCreateOrder } = vi.hoisted(() => ({
  mockListBusinesses: vi.fn(),
  mockListOfferings: vi.fn(),
  mockCreateOrder: vi.fn(),
}));

const { mockCreatePayment, mockConfirmPayment } = vi.hoisted(() => ({
  mockCreatePayment: vi.fn(),
  mockConfirmPayment: vi.fn(),
}));

vi.mock("../../lib/catalog", () => ({
  listBusinesses: mockListBusinesses,
  listOfferings: mockListOfferings,
  createOrder: mockCreateOrder,
}));

vi.mock("../../lib/money", () => ({
  createMerchantPayment: mockCreatePayment,
  confirmPayment: mockConfirmPayment,
  newIdempotencyKey: () => "test-key",
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockListOfferings.mockResolvedValue([]);
  mockListBusinesses.mockResolvedValue([
    {
      id: "b1",
      name: "Ama's Kitchen",
      category: "Food",
      description: "Local dishes.",
      location: "Accra",
      verification_status: "verified",
      average_rating: 4.5,
      review_count: 12,
      created_at: "2026-09-22T00:00:00Z",
    },
  ]);
});

describe("Discover", () => {
  it("lists businesses and opens detail with offerings", async () => {
    const user = userEvent.setup();
    mockListOfferings.mockResolvedValue([
      { id: "o1", name: "Jollof", kind: "product", price: "15.00" },
    ]);
    render(<Discover onGo={() => {}} />);

    expect(await screen.findByText("Ama's Kitchen")).toBeInTheDocument();
    expect(screen.getByText("verified")).toBeInTheDocument();

    await user.click(screen.getByText("Ama's Kitchen"));
    expect(await screen.findByText("Jollof")).toBeInTheDocument();
    expect(screen.getByText("product · 15.00 ESP")).toBeInTheDocument();
    expect(mockListOfferings).toHaveBeenCalledWith("b1");
  });

  it("searches with the entered query", async () => {
    const user = userEvent.setup();
    render(<Discover onGo={() => {}} />);
    await screen.findByText("Ama's Kitchen");

    await user.type(screen.getByPlaceholderText("Search businesses…"), "kitchen");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(mockListBusinesses).toHaveBeenCalledWith("kitchen");
  });

  it("handles an empty directory honestly", async () => {
    mockListBusinesses.mockResolvedValue([]);
    render(<Discover onGo={() => {}} />);
    expect(await screen.findByText("No businesses found.")).toBeInTheDocument();
  });

  it("builds a basket and places an order", async () => {
    const user = userEvent.setup();
    const onGo = vi.fn();
    mockListOfferings.mockResolvedValue([
      { id: "o1", name: "Jollof", kind: "product", price: "15.00" },
      { id: "o2", name: "Banku", kind: "product", price: "10.00" },
    ]);
    mockCreateOrder.mockResolvedValue({ id: "ord1", total: "40.00" });
    render(<Discover onGo={onGo} />);
    await user.click(await screen.findByText("Ama's Kitchen"));

    await user.click(screen.getByRole("button", { name: "Add one Jollof" }));
    await user.click(screen.getByRole("button", { name: "Add one Jollof" }));
    await user.click(screen.getByRole("button", { name: "Add one Banku" }));
    expect(screen.getByText(/Basket: 3 items · ≈ 40.00 ESP/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Place order" }));
    expect(mockCreateOrder).toHaveBeenCalledWith("b1", [
      { offering: "o1", quantity: 2 },
      { offering: "o2", quantity: 1 },
    ]);
    expect(await screen.findByText(/Order placed: 40.00 ESP/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View your orders" }));
    expect(onGo).toHaveBeenCalledWith("orders");
  });

  it("reports order failures without clearing the basket", async () => {
    const user = userEvent.setup();
    const { ApiError } = await import("../../lib/api");
    mockListOfferings.mockResolvedValue([
      { id: "o1", name: "Jollof", kind: "product", price: "15.00" },
    ]);
    mockCreateOrder.mockRejectedValue(new ApiError(400, { detail: "Offering unavailable." }));
    render(<Discover onGo={() => {}} />);
    await user.click(await screen.findByText("Ama's Kitchen"));
    await user.click(screen.getByRole("button", { name: "Add one Jollof" }));
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(await screen.findByText("Offering unavailable.")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity of Jollof")).toHaveTextContent("1");
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
  });

  it("pays for a placed order with the order linked", async () => {
    const user = userEvent.setup();
    mockListOfferings.mockResolvedValue([
      { id: "o1", name: "Jollof", kind: "product", price: "15.00" },
    ]);
    mockCreateOrder.mockResolvedValue({ id: "ord9", total: "30.00" });
    mockCreatePayment.mockResolvedValue({
      id: "pay9",
      narration: "Order at Ama's Kitchen",
      amount_espees: "30.00",
      status: "pending",
      payment_url: "https://payment.espees.org/pay/ref-9",
      created_at: "2026-09-22T00:00:00Z",
      updated_at: "2026-09-22T00:00:00Z",
    });
    render(<Discover onGo={() => {}} />);
    await user.click(await screen.findByText("Ama's Kitchen"));
    await user.click(screen.getByRole("button", { name: "Add one Jollof" }));
    await user.click(screen.getByRole("button", { name: "Add one Jollof" }));
    await user.click(screen.getByRole("button", { name: "Place order" }));
    await screen.findByText(/Order placed: 30.00 ESP/);

    await user.click(screen.getByRole("button", { name: "Pay 30.00 ESP now" }));
    expect(mockCreatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount_espees: "30.00",
        user_data: { eenp_order_id: "ord9" },
      }),
    );
    const link = await screen.findByRole("link", { name: "Continue in Espees portal" });
    expect(link).toHaveAttribute("href", "https://payment.espees.org/pay/ref-9");
  });
});
