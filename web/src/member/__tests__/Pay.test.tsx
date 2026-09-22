import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Payment } from "../../lib/money";
import { Pay } from "../Pay";

const { mockCreate, mockConfirm } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockConfirm: vi.fn(),
}));

vi.mock("../../lib/money", () => ({
  createMerchantPayment: mockCreate,
  confirmPayment: mockConfirm,
  newIdempotencyKey: () => "test-key",
}));

function paymentFixture(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay1",
    operation_type: "merchant_payment",
    product_sku: "EENP-ABC",
    narration: "Lunch",
    amount_espees: "25.00",
    merchant_wallet: "0xmerchant",
    success_url: "",
    fail_url: "",
    user_data: {},
    idempotency_key: "test-key",
    correlation_id: "corr1",
    espees_payment_ref: "ref-123",
    external_status: "",
    customer_username: "",
    status_details: "",
    transaction_date_raw: "",
    status: "pending",
    status_detail: "Awaiting customer payment.",
    confirmed_at: null,
    payment_url: "https://payment.espees.org/pay/ref-123",
    created_at: "2026-09-22T00:00:00Z",
    updated_at: "2026-09-22T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Pay", () => {
  it("creates a payment and shows the portal handoff", async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue(paymentFixture());
    render(<Pay />);

    await user.type(screen.getByPlaceholderText(/Lunch at Ama's Kitchen/), "Lunch");
    await user.type(screen.getByPlaceholderText("25.00"), "25.00");
    await user.click(screen.getByRole("button", { name: "Create payment" }));

    expect(await screen.findByText("Ref: ref-123")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Continue in Espees portal" });
    expect(link).toHaveAttribute("href", "https://payment.espees.org/pay/ref-123");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ narration: "Lunch", amount_espees: "25.00" }),
    );
  });

  it("checks confirmation and reports the verified payer", async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue(paymentFixture());
    mockConfirm.mockResolvedValue(
      paymentFixture({ status: "completed", external_status: "APPROVED", customer_username: "usertest01" }),
    );
    render(<Pay />);

    await user.type(screen.getByPlaceholderText(/Lunch at Ama's Kitchen/), "Lunch");
    await user.type(screen.getByPlaceholderText("25.00"), "25.00");
    await user.click(screen.getByRole("button", { name: "Create payment" }));
    await screen.findByText("Ref: ref-123");

    await user.click(screen.getByRole("button", { name: "Check confirmation status" }));
    expect(await screen.findByText("Confirmed as usertest01.")).toBeInTheDocument();
    expect(mockConfirm).toHaveBeenCalledWith("pay1");
  });

  it("shows creation failures without inventing a payment", async () => {
    const user = userEvent.setup();
    const { ApiError } = await import("../../lib/api");
    mockCreate.mockRejectedValue(new ApiError(400, { detail: "Amount invalid." }));
    render(<Pay />);

    await user.type(screen.getByPlaceholderText(/Lunch at Ama's Kitchen/), "Lunch");
    await user.type(screen.getByPlaceholderText("25.00"), "25.00");
    await user.click(screen.getByRole("button", { name: "Create payment" }));

    expect(await screen.findByText("Amount invalid.")).toBeInTheDocument();
    expect(screen.queryByText(/Ref:/)).not.toBeInTheDocument();
  });
});
