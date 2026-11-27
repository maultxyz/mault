import { defineTutorial } from "../../lib/tutorial-sources";

const SCANNER_PAGE_PATH = "/app";
const COLLECTIONS_API_PATH = "/api/collections";
const REVIEW_LAYOUT_STORAGE_KEY = "magic-vault:card-review-layout";
const COUNT_PLACEHOLDER = "__count__";
const AUTO_CHECK_PROGRESS_TIMEOUT_MS = 60_000;

function escapeForRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default defineTutorial({
  startPath: SCANNER_PAGE_PATH,
  viewports: ["desktop", "mobile"],
  async prepare(tutorial) {
    const { page } = tutorial;
    await page.evaluate(
      ([storageKey]) => localStorage.setItem(storageKey, "grid"),
      [REVIEW_LAYOUT_STORAGE_KEY],
    );
    if (!tutorial.isMobile) {
      await tutorial.goto(SCANNER_PAGE_PATH);
      return;
    }
    const collectionsResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === COLLECTIONS_API_PATH && response.request().method() === "GET",
    );
    await tutorial.goto(SCANNER_PAGE_PATH);
    const { data } = (await (await collectionsResponse).json()) as {
      data: { guid: string; isActive: boolean }[];
    };
    const activeCollection = data.find((collection) => collection.isActive);
    if (!activeCollection) throw new Error("The demo org has no active collection to review.");
    await tutorial.goto(`/app/monitor/${activeCollection.guid}`);
  },
  async run(tutorial) {
    const { page, ui } = tutorial;
    const reviewLabel = tutorial.isMobile
      ? ui("scanner:mobileMonitor.review", { count: COUNT_PLACEHOLDER })
      : ui("cards:cardToolbar.reviewCount", { count: COUNT_PLACEHOLDER });
    const reviewButton = page.getByRole("button", {
      name: new RegExp(`^${escapeForRegExp(reviewLabel).replace(COUNT_PLACEHOLDER, "\\d+")}$`),
    });
    const checkingProgressText = ui("cards:reviewGrid.autoChecking", {
      checked: COUNT_PLACEHOLDER,
      total: COUNT_PLACEHOLDER,
    });
    const checkingAfterFirstBatch = new RegExp(
      escapeForRegExp(checkingProgressText).replace(COUNT_PLACEHOLDER, "[1-9]\\d*").replace(COUNT_PLACEHOLDER, "\\d+"),
    );
    const pausedPrefix = ui("cards:reviewGrid.autoCheckPaused", {
      checked: COUNT_PLACEHOLDER,
      total: COUNT_PLACEHOLDER,
    }).split(COUNT_PLACEHOLDER)[0];

    await tutorial.step("intro", async () => {
      await reviewButton.first().waitFor();
      await tutorial.hover(reviewButton.first(), { zoomsIn: true });
    });

    await tutorial.step("openReview", async () => {
      await tutorial.click(reviewButton.first());
      await page.getByRole("heading", { name: ui("cards:reviewGrid.title") }).waitFor();
      tutorial.zoomOut();
    });

    await tutorial.step("startAutoCheck", async () => {
      await tutorial.click(page.getByRole("button", { name: ui("cards:reviewGrid.autoCheck"), exact: true }));
    });

    await tutorial.step("checking", async () => {
      await page.getByText(ui("cards:reviewGrid.autoCheckCheckingCard")).first().waitFor();
      tutorial.zoomOut();
    });

    await tutorial.step("results", async () => {
      await page.getByText(checkingAfterFirstBatch).waitFor({ timeout: AUTO_CHECK_PROGRESS_TIMEOUT_MS });
      tutorial.zoomOut();
    });

    await tutorial.step("pause", async () => {
      await tutorial.click(page.getByRole("button", { name: ui("cards:reviewGrid.autoCheckPause"), exact: true }));
      await page.getByText(pausedPrefix).waitFor({ timeout: AUTO_CHECK_PROGRESS_TIMEOUT_MS });
    });

    await tutorial.step("resume", async () => {
      await tutorial.hover(page.getByRole("button", { name: ui("cards:reviewGrid.autoCheckResume") }), {
        zoomsIn: true,
      });
    });
  },
});
