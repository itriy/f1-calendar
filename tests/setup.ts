import { afterEach } from "vitest";
import { initializeLocale } from "../src/shared/config/i18n";

localStorage.setItem("f1-calendar-locale", "uk");
await initializeLocale();

afterEach(() => {
  document.body.innerHTML = "";
});
