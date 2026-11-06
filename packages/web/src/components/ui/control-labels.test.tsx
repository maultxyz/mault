import { render, screen } from "@testing-library/react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { expect, it } from "vitest";
it("names Switch and Checkbox from wrapping and htmlFor labels", () => {
  render(<div>
    <label>Wrapped switch <Switch /></label>
    <Label htmlFor="s2">For switch</Label><Switch id="s2" />
    <label>Wrapped checkbox <Checkbox /></label>
    <Label htmlFor="c2">For checkbox</Label><Checkbox id="c2" />
    <Switch aria-label="Explicit" />
  </div>);
  expect(screen.getByRole("switch", { name: "Wrapped switch" })).toBeTruthy();
  expect(screen.getByRole("switch", { name: "For switch" })).toBeTruthy();
  expect(screen.getByRole("checkbox", { name: "Wrapped checkbox" })).toBeTruthy();
  expect(screen.getByRole("checkbox", { name: "For checkbox" })).toBeTruthy();
  expect(screen.getByRole("switch", { name: "Explicit" })).toBeTruthy();
});
