import { defineTutorial } from "../../lib/tutorial-sources";

export default defineTutorial({
  startPath: "/app/home",
  viewports: ["desktop", "mobile"],
  async run(tutorial) {
    const { page, ui } = tutorial;
    const searchDialog = page.getByRole("dialog");

    await tutorial.step(tutorial.isMobile ? "openSearchMobile" : "openSearch", async () => {
      await tutorial.click(page.getByRole("button", { name: ui("search:placeholder") }));
    });

    await tutorial.step("typeName", async () => {
      await tutorial.type(searchDialog.getByPlaceholder(ui("search:placeholder")), "Lightning Bolt");
    });

    await tutorial.step("readResults", async () => {
      await searchDialog.getByText(ui("search:sections.catalog")).first().waitFor();
      tutorial.zoomOut();
    });

    await tutorial.step("openCard", async () => {
      await tutorial.click(searchDialog.getByRole("option").first());
    });

    await tutorial.step("cardPage", async () => {
      await page.locator("#main-content h1").first().waitFor();
      tutorial.zoomOut();
    });
  },
});
