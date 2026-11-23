import { defineTutorial } from "../../lib/tutorial-sources";

const SCANNER_PAGE_PATH = "/app";
const DEMO_CUSTOMER_NAME = "Alex Morgan";
const CARDS_TO_SCAN = ["Sol Ring", "Swords to Plowshares", "Rhystic Study"];

export default defineTutorial({
  startPath: SCANNER_PAGE_PATH,
  viewports: ["desktop"],
  async prepare(tutorial) {
    const { page, ui } = tutorial;
    const leftoverIntakePanel = page.getByLabel(ui("business:scannerBuy.panelLabel"));
    if (!(await leftoverIntakePanel.isVisible())) return;
    await leftoverIntakePanel.getByRole("button", { name: ui("business:intake.cancelLot") }).click();
    await page.getByRole("dialog").getByRole("button", { name: ui("business:intake.cancelLot") }).click();
    await page.getByText(ui("business:intake.cancelled")).first().waitFor();
    await tutorial.goto(SCANNER_PAGE_PATH);
  },
  async run(tutorial) {
    const { page, ui } = tutorial;
    const dialog = page.getByRole("dialog");
    const startBar = page.getByLabel(ui("business:scannerBuy.startPrompt.title"));
    const intakePanel = page.getByLabel(ui("business:scannerBuy.panelLabel"));

    async function scanCard(cardName: string) {
      await tutorial.showCardToCamera(cardName);
      await intakePanel.getByText(cardName).first().waitFor({ timeout: 45_000 });
      await tutorial.clearCamera();
    }

    await tutorial.step("intro", async () => {
      await tutorial.hover(startBar, { zoomsIn: true });
    });

    await tutorial.step("newIntake", async () => {
      await tutorial.click(startBar.getByRole("button", { name: ui("business:scannerBuy.startPrompt.start") }));
    });

    await tutorial.step("source", async () => {
      await tutorial.hover(dialog.getByText(ui("business:intake.sourceTypes.customer"), { exact: true }).first(), {
        zoomsIn: true,
      });
    });

    await tutorial.step("name", async () => {
      await tutorial.type(dialog.getByLabel(ui("business:intake.nameLabels.customer")), DEMO_CUSTOMER_NAME);
    });

    await tutorial.step("collection", async () => {
      await tutorial.hover(dialog.locator("#buy-collection"), { zoomsIn: true });
    });

    await tutorial.step("start", async () => {
      await tutorial.click(dialog.getByRole("button", { name: ui("business:intake.start") }));
      await intakePanel.waitFor();
      tutorial.zoomOut();
    });

    await tutorial.step("recentCards", async () => {
      await tutorial.click(intakePanel.getByRole("button", { name: ui("business:scannerBuy.recentCards") }));
    });

    await tutorial.step("startScanning", async () => {
      await tutorial.click(page.getByRole("button", { name: ui("scanner:scannerControls.start") }));
      tutorial.zoomOut();
    });

    await tutorial.step("scanFirstCard", async () => {
      await scanCard(CARDS_TO_SCAN[0]);
    });

    await tutorial.step("scanMoreCards", async () => {
      for (const cardName of CARDS_TO_SCAN.slice(1)) {
        await tutorial.pause(1200);
        await scanCard(cardName);
      }
    });

    await tutorial.step("pauseScanning", async () => {
      await tutorial.click(page.getByRole("button", { name: ui("scanner:scannerControls.pause"), exact: true }));
    });

    await tutorial.step("offer", async () => {
      await tutorial.hover(intakePanel.getByText(ui("business:intake.stats.cash"), { exact: true }).first(), {
        zoomsIn: true,
      });
    });

    await tutorial.step("finish", async () => {
      await tutorial.hover(intakePanel.getByRole("button", { name: ui("business:scannerBuy.finish") }), {
        zoomsIn: true,
      });
    });

    await tutorial.step("cancel", async () => {
      await tutorial.click(intakePanel.getByRole("button", { name: ui("business:intake.cancelLot") }));
    });

    await tutorial.step("confirmCancel", async () => {
      await tutorial.click(dialog.getByRole("button", { name: ui("business:intake.cancelLot") }));
      await page.getByText(ui("business:intake.cancelled")).first().waitFor();
      tutorial.zoomOut();
    });
  },
});
