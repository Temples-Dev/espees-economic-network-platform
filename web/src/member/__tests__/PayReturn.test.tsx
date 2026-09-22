import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PayReturn } from "../PayReturn";

const { mockGetPayment, mockConfirmPayment } = vi.hoisted(() => ({
  mockGetPayment: vi.fn(),
  mockConfirmPayment: vi.fn(),
}));

vi.mock("../../lib/money", () => ({
  getPayment: mockGetPayment,
  confirmPayment: mockConfirmPayment,
}));

function setReturnUrl(payment: string, result = "success") {
  window.history.replaceState({}, "", `/payments/return?payment=${payment}&result=${result}`);
}

const base = {
  id: "pay1",
  narration: "Order at Ama's Kitchen",
  amount_espees: "40.00",
  status: "pending",
  status_detail: "Awaiting customer payment.",
  customer_username: "",
  payment_url: "",
  created_at: "2026-09-22T00:00:00Z",
  updated_at: "2026-09-22T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  setReturnUrl("pay1");
});

describe("PayReturn", () => {
  it("shows the verified status, not the redirect claim", async () => {
    mockGetPayment.mockResolvedValue({ ...base, status: "completed", customer_username: "u1" });
    render(<PayReturn />);
    expect(await screen.findByText("40.00 ESP · Order at Ama's Kitchen")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("Confirmed as u1.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check confirmation status" })).not.toBeInTheDocument();
  });

  it("offers a confirmation check while unsettled", async () => {
    const user = userEvent.setup();
    mockGetPayment.mockResolvedValue(base);
    mockConfirmPayment.mockResolvedValue({ ...base, status: "completed" });
    render(<PayReturn />);

    await user.click(await screen.findByRole("button", { name: "Check confirmation status" }));
    expect(mockConfirmPayment).toHaveBeenCalledWith("pay1");
    expect(await screen.findByText("completed")).toBeInTheDocument();
  });

  it("handles a missing payment reference", async () => {
    window.history.replaceState({}, "", "/payments/return");
    render(<PayReturn />);
    expect(await screen.findByText("No payment reference in this link.")).toBeInTheDocument();
    expect(mockGetPayment).not.toHaveBeenCalled();
  });
});
