import { PickImportPage } from "@/features/business/components/pick-import/pick-import-page";
import type { ImportTemplateRow } from "@/lib/interfaces/csv-import";
import type { FulfilmentOrderInput } from "@magic-vault/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTemplates: ImportTemplateRow[] = [];
const createOrder = vi.fn(async (input: FulfilmentOrderInput) => ({
  success: true as const,
  data: { guid: `pick-${input.name}` },
}));

const navigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
  useBlocker: () => ({ state: "unblocked" }),
}));

vi.mock("@/lib/api/import-templates", () => ({
  importTemplatesQueryOptions: () => ({
    queryKey: ["import-templates", "test"],
    queryFn: async () => mockTemplates,
  }),
  createImportTemplate: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: () => {}, error: () => {} },
}));

vi.mock("@/features/companies/api/use-organization", () => ({
  useOrg: () => ({}),
}));

vi.mock("@/features/business/api/business", () => ({
  createOrder: (input: FulfilmentOrderInput) => createOrder(input),
}));

vi.mock("@/features/business/api/use-business", () => ({
  useBusinessAccess: () => ({
    access: { isLocked: false, canFulfilOrders: true },
  }),
  useBusinessAction:
    () =>
    async <T,>(action: () => Promise<T>) =>
      action(),
}));

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

const ORDERS_CSV = [
  "Order #,Product Name,Quantity,Price",
  "1001,Sol Ring,1,1.50",
  "1001,Lightning Bolt,2,0.75",
  "1002,Sol Ring,1,1.50",
  ",Island,4,0.10",
].join("\n");

const NO_NAME_CSV = ["Quantity,Set", "2,MIR", "1,MIR"].join("\n");

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PickImportPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function paste(text: string) {
  fireEvent.change(screen.getByLabelText("pickImport.source.pasteLabel"), {
    target: { value: text },
  });
}

async function clickNext() {
  const next = screen.getByRole("button", { name: "pickImport.actions.next" });
  await waitFor(() => expect(next).not.toBeDisabled());
  fireEvent.click(next);
}

async function clickCreate() {
  const create = screen.getByRole("button", {
    name: "pickImport.actions.create",
  });
  await waitFor(() => expect(create).not.toBeDisabled());
  fireEvent.click(create);
}

describe("PickImportPage", () => {
  beforeEach(() => {
    mockTemplates.length = 0;
    createOrder.mockClear();
    navigate.mockClear();
    try {
      localStorage.clear();
    } catch {
      return;
    }
  });

  it("batches every order into one pick and keeps each line's order", async () => {
    renderPage();
    paste(ORDERS_CSV);
    await clickNext();
    expect(
      await screen.findByLabelText(/fields\.name/),
    ).toBeInTheDocument();
    await clickNext();
    expect(
      screen.getByLabelText("pickImport.review.create.together"),
    ).toBeChecked();
    expect(createOrder).not.toHaveBeenCalled();
    await clickCreate();

    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    const [request] = createOrder.mock.calls[0];
    expect(request.name).toBe("orders.batchName");
    expect(
      request.lines.map((line) => [line.name, line.quantity, line.orderRef]),
    ).toEqual([
      ["Sol Ring", 1, "1001"],
      ["Lightning Bolt", 2, "1001"],
      ["Sol Ring", 1, "1002"],
      ["Island", 4, null],
    ]);
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        "/app/orders/pick?order=pick-orders.batchName",
      ),
    );
  });

  it("creates one pick per order when asked", async () => {
    renderPage();
    paste(ORDERS_CSV);
    await clickNext();
    await clickNext();
    fireEvent.click(screen.getByLabelText("pickImport.review.create.separate"));
    await clickCreate();

    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(3));
    expect(createOrder.mock.calls.map(([request]) => request.name)).toEqual([
      "1001",
      "1002",
      "orders.importedName",
    ]);
  });

  it("goes straight to review for a plain card list", async () => {
    renderPage();
    paste("4 Lightning Bolt\n1 Sol Ring");
    await clickNext();
    expect(
      screen.queryByRole("button", { name: "pickImport.actions.next" }),
    ).not.toBeInTheDocument();
    await clickCreate();

    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    expect(createOrder.mock.calls[0][0].lines).toEqual([
      { name: "Lightning Bolt", quantity: 4 },
      { name: "Sol Ring", quantity: 1 },
    ]);
  });

  it("keeps Next disabled until the card name column is matched", async () => {
    renderPage();
    paste(NO_NAME_CSV);
    await clickNext();
    expect(
      await screen.findByRole("button", { name: "pickImport.actions.next" }),
    ).toBeDisabled();
  });
});
