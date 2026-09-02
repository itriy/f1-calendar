import { mount } from "@vue/test-utils";
import { expect, test } from "vitest";
import { i18n } from "../src/shared/config/i18n";
import WikiLink from "../src/shared/ui/WikiLink.vue";

test("upgrades Jolpica HTTP Wikipedia URLs to HTTPS", () => {
  const wrapper = mount(WikiLink, {
    props: {
      label: "Lando Norris",
      url: "http://en.wikipedia.org/wiki/Lando_Norris",
    },
    global: { plugins: [i18n] },
  });

  expect(wrapper.get("a").attributes("href")).toBe(
    "https://en.wikipedia.org/wiki/Lando_Norris",
  );
  expect(wrapper.get("a").attributes("rel")).toBe(
    "nofollow noindex noopener noreferrer",
  );
});

test("does not render a link for non-web URL protocols", () => {
  const wrapper = mount(WikiLink, {
    props: { label: "Driver", url: "javascript:alert(1)" },
    global: { plugins: [i18n] },
  });

  expect(wrapper.find("a").exists()).toBe(false);
  expect(wrapper.text()).toBe("Driver");
});
