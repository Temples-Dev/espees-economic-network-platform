import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Campaigns } from "../Campaigns";

const { mockList, mockGet, mockContribute } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGet: vi.fn(),
  mockContribute: vi.fn(),
}));

vi.mock("../../lib/catalog", () => ({
  listCampaigns: mockList,
  getCampaign: mockGet,
  contributeToCampaign: mockContribute,
}));

const active = {
  id: "c1",
  title: "School Fund",
  description: "Books for pupils.",
  purpose: "Education",
  goal_espees: "1000.00",
  raised_espees: "250.00",
  contribution_count: 5,
  status: "active",
  end_date: null,
  created_at: "2026-09-22T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue([active]);
  mockGet.mockResolvedValue(active);
});

describe("Campaigns", () => {
  it("lists campaigns with funding progress", async () => {
    render(<Campaigns />);
    expect(await screen.findByText("School Fund")).toBeInTheDocument();
    expect(screen.getByText("250.00 / 1000.00 ESP · 25% · 5 contributions")).toBeInTheDocument();
  });

  it("contributes to an active campaign and refreshes", async () => {
    const user = userEvent.setup();
    mockContribute.mockResolvedValue({ id: "cc1" });
    render(<Campaigns />);
    await user.click(await screen.findByText("School Fund"));

    await user.type(screen.getByPlaceholderText("10.00"), "10.00");
    await user.type(screen.getByPlaceholderText("Good luck!"), "For the kids");
    await user.click(screen.getByRole("button", { name: "Contribute" }));

    expect(mockContribute).toHaveBeenCalledWith("c1", "10.00", "For the kids");
    expect(await screen.findByText(/Contribution recorded/)).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith("c1");
  });

  it("blocks contributing to inactive campaigns", async () => {
    const user = userEvent.setup();
    const draft = { ...active, status: "draft" };
    mockList.mockResolvedValue([draft]);
    mockGet.mockResolvedValue(draft);
    render(<Campaigns />);
    await user.click(await screen.findByText("School Fund"));
    expect(await screen.findByText(/not accepting contributions/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Contribute" })).not.toBeInTheDocument();
  });
});
