import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Orders } from "../Orders";

const { mockListOrders } = vi.hoisted(() => ({
  mockListOrders: vi.fn(),
}));

vi.mock("../../lib/catalog", () => ({
  listOrders: mockListOrders,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Orders", () => {
  it("lists orders with line items", async () => {
    mockListOrders.mockResolvedValue([
      {
        id: "o1",
        business_name: "Ama's Kitchen",
        status: "confirmed",
        total: "30.00",
        items: [{ offering_name: "Jollof", quantity: 2, unit_price: "15.00", line_total: "30.00" }],
        created_at: "2026-09-22T00:00:00Z",
      },
    ]);
    render(<Orders />);

    expect(await screen.findByText("30.00 ESP · Ama's Kitchen")).toBeInTheDocument();
    expect(screen.getByText("Jollof × 2 — 30.00 ESP")).toBeInTheDocument();
    expect(screen.getByText("confirmed")).toBeInTheDocument();
  });

  it("handles no orders", async () => {
    mockListOrders.mockResolvedValue([]);
    render(<Orders />);
    expect(await screen.findByText(/No orders yet/)).toBeInTheDocument();
  });
});
