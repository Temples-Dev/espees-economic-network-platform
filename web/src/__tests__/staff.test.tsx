import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Orders, Wallets } from "../App";

const { mockGetList, mockPost, mockPatch } = vi.hoisted(() => ({
  mockGetList: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
}));

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    api: {
      getList: mockGetList,
      post: mockPost,
      patch: mockPatch,
    },
  };
});

const walletRow = {
  id: "w1",
  user_id: "u1",
  user_email: "member@example.com",
  espees_wallet_address: "0xd15c259d11dfe0bb39383fd3270d74f6d124a13b",
  external_account_reference: "",
  status: "requires_action",
  status_detail: "Claimed, pending verification.",
  provisioned_at: null,
  updated_at: "2026-09-22T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Wallets queue", () => {
  it("lists claims and verifies one", async () => {
    const user = userEvent.setup();
    mockGetList.mockResolvedValue([walletRow]);
    mockPost.mockResolvedValue({});
    render(<Wallets />);

    expect(await screen.findByText("member@example.com")).toBeInTheDocument();
    expect(
      screen.getByText("0xd15c259d11dfe0bb39383fd3270d74f6d124a13b"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Verify address" }));
    expect(mockPost).toHaveBeenCalledWith("/api/v1/wallet/verify/", { user_id: "u1" });
    expect(await screen.findByText("Verified wallet for member@example.com.")).toBeInTheDocument();
    expect(mockGetList).toHaveBeenCalledTimes(2);
  });

  it("switches queue filters", async () => {
    const user = userEvent.setup();
    mockGetList.mockResolvedValue([]);
    render(<Wallets />);
    await screen.findByText("Queue empty.");

    await user.click(screen.getByRole("button", { name: "associated" }));
    expect(mockGetList).toHaveBeenLastCalledWith("/api/v1/wallets/?status=associated");
  });

  it("hides verify for already-associated rows", async () => {
    mockGetList.mockResolvedValue([{ ...walletRow, status: "associated" }]);
    render(<Wallets />);
    await screen.findByText("member@example.com");
    expect(screen.queryByRole("button", { name: "Verify address" })).not.toBeInTheDocument();
  });
});

describe("Orders actions", () => {
  const pending = {
    id: "o1",
    customer_email: "buyer@example.com",
    business_name: "Ama's Kitchen",
    status: "pending",
    total: "30.00",
    created_at: "2026-09-22T00:00:00Z",
  };

  it("offers valid transitions and applies one", async () => {
    const user = userEvent.setup();
    mockGetList.mockResolvedValue([pending]);
    mockPatch.mockResolvedValue({});
    render(<Orders />);

    const card = await screen.findByText("30.00 Espees · pending");
    const scope = within(card.closest("div") as HTMLElement);
    await user.click(scope.getByRole("button", { name: "Mark confirmed" }));
    expect(mockPatch).toHaveBeenCalledWith("/api/v1/orders/o1/status/", {
      status: "confirmed",
    });
    expect(mockGetList).toHaveBeenCalledTimes(2);
  });

  it("shows no actions for terminal orders", async () => {
    mockGetList.mockResolvedValue([{ ...pending, id: "o2", status: "fulfilled" }]);
    render(<Orders />);
    await screen.findByText("30.00 Espees · fulfilled");
    expect(screen.queryByRole("button", { name: /Mark / })).not.toBeInTheDocument();
  });

  it("reports transition failures", async () => {
    const user = userEvent.setup();
    mockGetList.mockResolvedValue([pending]);
    const { ApiError } = await import("../lib/api");
    mockPatch.mockRejectedValue(new ApiError(400, { detail: "Invalid transition." }));
    render(<Orders />);

    const card = await screen.findByText("30.00 Espees · pending");
    const scope = within(card.closest("div") as HTMLElement);
    await user.click(scope.getByRole("button", { name: "Mark cancelled" }));
    expect(await screen.findByText("Invalid transition.")).toBeInTheDocument();
  });
});
