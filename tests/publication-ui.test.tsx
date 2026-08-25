// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../src/messages/en.json";
import { AdminPublicationRequests } from "../src/modules/publication/ui/admin-publication-requests";
import { PublicationHistory } from "../src/modules/publication/ui/publication-history";

const pending = {
  contentId: "content-1",
  id: "request-1",
  processingStatus: "ready",
  requestedAt: "2026-08-25T12:00:00.000Z",
  requesterEmail: "reader@example.com",
  requesterName: "Reader",
  sourceType: "upload_mobi",
  status: "pending" as const,
  title: "Shared book",
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("publication review interfaces", () => {
  it("requires an administrator justification and records an approval", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ status: "approved" }), { status: 200 }));
    render(<AdminPublicationRequests initialRequests={[pending]} />);

    await user.click(screen.getByRole("button", { name: "Aprovar" }));
    expect(screen.getByText(/pelo menos 5 caracteres/)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Justificativa obrigatória"), "Conteúdo adequado para a biblioteca pública.");
    await user.click(screen.getByRole("button", { name: "Aprovar" }));
    await waitFor(() => expect(screen.getByText("Publicação aprovada.")).toBeVisible());
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/publication-requests/request-1", expect.objectContaining({ method: "PATCH" }));
  });

  it("shows the administrator decision and justification to the submitting reader", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PublicationHistory requests={[{ ...pending, justification: "The source is incomplete.", status: "rejected" }]} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Rejected")).toBeVisible();
    expect(screen.getByText("The source is incomplete.")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Open published book" })).not.toBeInTheDocument();
  });
});
