import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Capabilities, WalletAssociation } from "../../lib/money";
import { Wallet } from "../Wallet";

const { mockGetWallet, mockLinkWallet, mockListPayments } = vi.hoisted(() => ({
  mockGetWallet: vi.fn(),
  mockLinkWallet: vi.fn(),
  mockListPayments: vi.fn(),
}));

vi.mock("../../lib/money", () => ({
  getWallet: mockGetWallet,
  linkWallet: mockLinkWallet,
  listPayments: mockListPayments,
}));

const caps: Capabilities = {
  BALANCE_AVAILABLE: false,
  FUNDING_AVAILABLE: false,
  PAYMENT_AVAILABLE: true,
  RECEIVING_AVAILABLE: false,
  WITHDRAWAL_AVAILABLE: false,
  wallet_status: "pending_external",
  wallet_ready: false,
  merchant_configured: true,
};

function walletFixture(overrides: Partial<WalletAssociation> = {}): WalletAssociation {
  return {
    id: "w1",
    espees_wallet_id: "",
    espees_wallet_address: "",
    external_account_reference: "",
    status: "pending_external",
    status_detail: "Awaiting official Espees provisioning.",
    metadata: {},
    provisioned_at: null,
    created_at: "2026-09-22T00:00:00Z",
    updated_at: "2026-09-22T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListPayments.mockResolvedValue([]);
});

describe("Wallet", () => {
  it("shows the association status and honest capability states", async () => {
    mockGetWallet.mockResolvedValue({ wallet: walletFixture(), capabilities: caps });
    render(<Wallet />);

    expect(await screen.findByText("Espees wallet")).toBeInTheDocument();
    expect(screen.getByText("pending external")).toBeInTheDocument();
    expect(screen.getByText("Awaiting official Espees provisioning.")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(screen.getAllByText("Coming soon").length).toBeGreaterThan(0);
    expect(screen.getByText("Pay")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  it("offers the link form while unverified and claims on submit", async () => {
    const user = userEvent.setup();
    mockGetWallet.mockResolvedValue({ wallet: walletFixture(), capabilities: caps });
    mockLinkWallet.mockResolvedValue(walletFixture({ status: "requires_action" }));
    render(<Wallet />);

    const input = await screen.findByPlaceholderText("0x…");
    await user.type(input, "0xd15c259d11dfe0bb39383fd3270d74f6d124a13b");
    await user.click(screen.getByRole("button", { name: "Claim address" }));

    await waitFor(() => {
      expect(mockLinkWallet).toHaveBeenCalledWith("0xd15c259d11dfe0bb39383fd3270d74f6d124a13b");
    });
    expect(await screen.findByText(/Staff verification is pending/)).toBeInTheDocument();
  });

  it("hides the link form once the wallet is associated", async () => {
    mockGetWallet.mockResolvedValue({
      wallet: walletFixture({
        status: "associated",
        espees_wallet_address: "0xd15c259d11dfe0bb39383fd3270d74f6d124a13b",
      }),
      capabilities: { ...caps, wallet_status: "associated", wallet_ready: true },
    });
    render(<Wallet />);

    expect(await screen.findByText("associated")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("0x…")).not.toBeInTheDocument();
    expect(
      screen.getByText("0xd15c259d11dfe0bb39383fd3270d74f6d124a13b"),
    ).toBeInTheDocument();
  });

  it("lists platform payments without claiming full history", async () => {
    mockGetWallet.mockResolvedValue({ wallet: walletFixture(), capabilities: caps });
    mockListPayments.mockResolvedValue([
      {
        id: "p1",
        narration: "Lunch",
        amount_espees: "25.00",
        status: "completed",
        customer_username: "usertest01",
        created_at: "2026-09-22T00:00:00Z",
      },
    ]);
    render(<Wallet />);

    expect(await screen.findByText("Lunch", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/paid as usertest01/)).toBeInTheDocument();
    expect(
      screen.getByText(/Activity elsewhere in Espees is not shown here/),
    ).toBeInTheDocument();
  });
});
