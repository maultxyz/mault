import { defineTutorial } from "../../lib/tutorial-sources";

const INTAKE_PAGE_PATH = "/app/orders/intake";
const DEMO_CUSTOMER_NAME = "Alex Morgan";
const DEMO_CARD_NAME = "Lightning Bolt";

export default defineTutorial({
  startPath: INTAKE_PAGE_PATH,
  viewports: ["desktop", "mobile"],
  async run(tutorial) {
    const { page, ui } = tutorial;
    const dialog = page.getByRole("dialog");

    await tutorial.step("intro");

    await tutorial.step("newIntake", async () => {
      await tutorial.click(page.getByRole("button", { name: ui("business:intake.new") }).first());
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
      await page.waitForURL((url) => !url.pathname.startsWith(INTAKE_PAGE_PATH));
      tutorial.zoomOut();
    });

    await tutorial.step("scanner");

    await tutorial.goto(INTAKE_PAGE_PATH);

    await tutorial.step("openIntake", async () => {
      await tutorial.click(page.getByRole("button", { name: new RegExp(DEMO_CUSTOMER_NAME) }).first());
      await page.getByRole("button", { name: ui("business:intake.addCard") }).waitFor();
    });

    await tutorial.step("addCard", async () => {
      await tutorial.click(page.getByRole("button", { name: ui("business:intake.addCard") }));
    });

    await tutorial.step("searchCard", async () => {
      await tutorial.type(dialog.getByLabel(ui("cards:cardPicker.searchLabel")), DEMO_CARD_NAME);
    });

    await tutorial.step("pickCard", async () => {
      await tutorial.click(dialog.getByRole("button", { name: new RegExp(DEMO_CARD_NAME) }).first());
      await page.getByText(ui("business:intake.cardCount", { count: 1 })).first().waitFor();
      await tutorial.press("Escape");
    });

    await tutorial.step("liveOffer", async () => {
      await tutorial.hover(page.getByText(ui("business:intake.stats.cash"), { exact: true }).first(), {
        zoomsIn: true,
      });
    });

    await tutorial.step("finish", async () => {
      await tutorial.hover(page.getByRole("button", { name: ui("business:intake.accept"), exact: true }), {
        zoomsIn: true,
      });
    });

    await tutorial.step("moreActions", async () => {
      await tutorial.click(page.getByRole("button", { name: ui("business:intake.moreActions") }));
    });

    await tutorial.step("cancelIntake", async () => {
      await tutorial.click(page.getByRole("menuitem", { name: ui("business:intake.cancelLot") }));
    });

    await tutorial.step("confirmCancel", async () => {
      await tutorial.click(dialog.getByRole("button", { name: ui("business:intake.cancelLot") }));
      await page.getByText(ui("business:intake.cancelled")).first().waitFor();
      tutorial.zoomOut();
    });
  },
});
