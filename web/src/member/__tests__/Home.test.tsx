import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Home } from "../Home";

const testUser = {
  id: "u1",
  email: "member@example.com",
  full_name: "Ada Member",
  is_verified: true,
  is_staff: false,
  wallet: null,
};

const { mockCaps, mockPayments, mockBusinesses, mockCampaigns } = vi.hoisted(() => ({
  mockCaps: vi.fn(),
  mockPayments: vi.fn(),
  mockBusinesses: vi.fn(),
  mockCampaigns: vi.fn(),
}));

vi.mock("../../lib/money", () => ({
  getCapabilities: mockCaps,
  listPayments: mockPayments,
}));

vi.mock("../../lib/catalog", () => ({
  listBusinesses: mockBusinesses,
  listCampaigns: mockCampaigns,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockCaps.mockResolvedValue({
    BALANCE_AVAILABLE: false,
    FUNDING_AVAILABLE: false,
    PAYMENT_AVAILABLE: true,
    RECEIVING_AVAILABLE: false,
    WITHDRAWAL_AVAILABLE: false,
    wallet_status: "pending_external",
    wallet_ready: false,
    merchant_configured: true,
  });
  mockPayments.mockResolvedValue([]);
  mockBusinesses.mockResolvedValue([{}, {}]);
  mockCampaigns.mockResolvedValue([{}]);
});

describe("Home", () => {
  it("shows wallet status, counts, and recent activity", async () => {
    mockPayments.mockResolvedValue([
      {
        id: "p1",
        narration: "Lunch",
        amount_espees: "25.00",
        status: "completed",
        created_at: "2026-09-22T00:00:00Z",
      },
    ]);
    render(<Home user={testUser} onGo={() => {}} />);

    expect(await screen.findByText("pending external")).toBeInTheDocument();
    expect(await screen.findByText("2")).toBeInTheDocument();
    expect(await screen.findByText("1")).toBeInTheDocument();
    expect(screen.getByText("Lunch", { exact: false })).toBeInTheDocument();
  });

  it("disables Pay when the capability is unavailable", async () => {
    mockCaps.mockResolvedValue({
      BALANCE_AVAILABLE: false,
      FUNDING_AVAILABLE: false,
      PAYMENT_AVAILABLE: false,
      RECEIVING_AVAILABLE: false,
      WITHDRAWAL_AVAILABLE: false,
      wallet_status: "pending_external",
      wallet_ready: false,
      merchant_configured: false,
    });
    render(<Home user={testUser} onGo={() => {}} />);

    expect(await screen.findByRole("button", { name: "Pay" })).toBeDisabled();
  });

  it("navigates to wallet and pay tabs", async () => {
    const user = userEvent.setup();
    const onGo = vi.fn();
    render(<Home user={testUser} onGo={onGo} />);
    await screen.findByText("pending external");

    await user.click(screen.getByRole("button", { name: "Open wallet" }));
    expect(onGo).toHaveBeenCalledWith("wallet");
    await user.click(screen.getByRole("button", { name: "Pay" }));
    expect(onGo).toHaveBeenCalledWith("pay");
  });
});
