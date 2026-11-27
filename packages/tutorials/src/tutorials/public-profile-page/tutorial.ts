import type { TutorialContext } from "../../lib/interfaces/tutorial";
import { defineTutorial } from "../../lib/tutorial-sources";

const PROFILE_SETTINGS_PATH = "/app/settings/profile";
const DEMO_HANDLE = "mault-demo";
const DEMO_DISPLAY_NAME = "Mault Demo Shop";
const DEMO_BIO = "Singles, sealed and trades. Come say hi at Friday Night Magic.";
const DEMO_LINK_URL = "tcgplayer.com/sellers/mault-demo";
const SHOWCASE_CARD_COUNT = 3;

function saveButtonOf(tutorial: TutorialContext) {
  return tutorial.page.getByRole("button", { name: new RegExp(`^${tutorial.ui("common:unsavedChanges.save")}`) });
}

export default defineTutorial({
  startPath: PROFILE_SETTINGS_PATH,
  viewports: ["desktop", "mobile"],
  async prepare(tutorial) {
    const { page, ui } = tutorial;
    await page.getByLabel(ui("org-profile:link.handleLabel")).waitFor();
    const removePrefix = ui("org-profile:reorder.remove", { name: "" }).trim();
    const removeButtons = page.getByRole("button", { name: new RegExp(`^${removePrefix} `) });
    while ((await removeButtons.count()) > 0) {
      await removeButtons.first().click();
    }
    const publishedSwitch = page.getByRole("switch", { name: ui("org-profile:published.label") });
    if ((await publishedSwitch.getAttribute("aria-checked")) === "true") await publishedSwitch.click();
    const saveButton = saveButtonOf(tutorial);
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await saveButton.waitFor({ state: "hidden" });
    }
    await tutorial.goto(PROFILE_SETTINGS_PATH);
  },
  async run(tutorial) {
    const { page, ui } = tutorial;
    const pickerDialog = page.getByRole("dialog");

    await tutorial.step("intro", async () => {
      await page.getByLabel(ui("org-profile:link.handleLabel")).waitFor();
      tutorial.zoomOut();
    });

    await tutorial.step("publish", async () => {
      await tutorial.click(page.getByRole("switch", { name: ui("org-profile:published.label") }));
    });

    await tutorial.step("handle", async () => {
      const handleInput = page.getByLabel(ui("org-profile:link.handleLabel"));
      await handleInput.fill("");
      await tutorial.type(handleInput, DEMO_HANDLE);
    });

    await tutorial.step("displayName", async () => {
      const displayNameInput = page.getByLabel(ui("org-profile:details.displayNameLabel"), { exact: true });
      await displayNameInput.fill("");
      await tutorial.type(displayNameInput, DEMO_DISPLAY_NAME);
    });

    await tutorial.step("bio", async () => {
      const bioInput = page.getByLabel(ui("org-profile:details.bioLabel"), { exact: true });
      await bioInput.fill("");
      await tutorial.type(bioInput, DEMO_BIO);
    });

    await tutorial.step("addLink", async () => {
      await tutorial.click(page.getByRole("button", { name: ui("org-profile:links.add") }));
      await tutorial.click(page.getByRole("combobox", { name: ui("org-profile:links.kindLabel") }).first());
      await tutorial.click(page.getByRole("option", { name: ui("org-profile:kinds.tcgplayer") }));
    });

    await tutorial.step("linkAddress", async () => {
      await tutorial.type(page.getByLabel(ui("org-profile:links.urlLabel")).last(), DEMO_LINK_URL);
    });

    await tutorial.step("openShowcase", async () => {
      await tutorial.click(page.getByRole("button", { name: ui("org-profile:showcase.add") }));
    });

    await tutorial.step("pickCards", async () => {
      const cardButtons = pickerDialog.locator("button[aria-pressed]");
      await cardButtons.first().waitFor();
      for (let index = 0; index < SHOWCASE_CARD_COUNT; index += 1) {
        await tutorial.click(cardButtons.nth(index), { zoomsIn: false });
      }
    });

    await tutorial.step("finishPicking", async () => {
      await tutorial.click(pickerDialog.getByRole("button", { name: ui("org-profile:picker.done") }));
      await pickerDialog.waitFor({ state: "hidden" });
    });

    await tutorial.step("prices", async () => {
      await tutorial.hover(page.getByRole("switch", { name: ui("org-profile:prices.label") }), { zoomsIn: true });
    });

    await tutorial.step("save", async () => {
      await tutorial.click(saveButtonOf(tutorial));
      await page.getByText(ui("org-profile:link.liveNote")).waitFor();
    });

    await tutorial.step("liveLink", async () => {
      await tutorial.hover(page.getByRole("button", { name: ui("org-profile:link.copy") }), { zoomsIn: true });
    });

    await tutorial.step("publicPage", async () => {
      await tutorial.goto(`/@${DEMO_HANDLE}`);
      await page.getByRole("heading", { level: 1, name: DEMO_DISPLAY_NAME }).waitFor();
      tutorial.zoomOut();
    });

    await tutorial.step("publicShowcase", async () => {
      await tutorial.hover(page.getByRole("heading", { name: ui("org-profile:public.showcaseHeading") }), {
        zoomsIn: true,
      });
    });
  },
});
