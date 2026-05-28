import { expect, test } from "@playwright/test";

test("theme toggle switches between dark and light mode", async ({ page }) => {
  await page.goto("/");

  const themeToggle = page.getByRole("button", { name: "Toggle theme" });
  await expect(themeToggle).toBeVisible();

  const initialPressed = await themeToggle.getAttribute("aria-pressed");
  
  await themeToggle.click();
  
  await expect(themeToggle).toHaveAttribute(
    "aria-pressed",
    initialPressed === "true" ? "false" : "true"
  );
});
