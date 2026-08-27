import { HAIR_COLORS, HAIR_STYLES, WEEKLY_CREDITS } from "@loxa/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "../app/page";
import PrivacyPolicy from "../app/privacy-policy/page";
import Terms from "../app/terms/page";

/**
 * The pages as markup.
 *
 * Server Components rendered with `renderToStaticMarkup`, which is enough to
 * assert the two things that actually matter here: the legal pages exist and
 * link back (App Store review checks both URLs), and the landing page cannot
 * advertise a style the app does not ship.
 */
describe("the landing page", () => {
  const html = renderToStaticMarkup(<Home />);

  it("lists every style the app ships, and no others", () => {
    for (const style of HAIR_STYLES) expect(html).toContain(style.name);
  });

  it("lists every colour, with its swatch", () => {
    for (const color of HAIR_COLORS) {
      expect(html).toContain(color.name);
      expect(html).toContain(color.hex);
    }
  });

  it("prints the price and what it buys, before any tap", () => {
    expect(html).toContain("$9.99");
    expect(html).toContain(`${WEEKLY_CREDITS} photos every week`);
  });

  it("links to both legal pages", () => {
    // App Store review needs both URLs to resolve, and the app links here.
    expect(html).toContain('href="/privacy-policy"');
    expect(html).toContain('href="/terms"');
  });
});

describe("the privacy policy", () => {
  const html = renderToStaticMarkup(<PrivacyPolicy />);

  it("carries the wordmark and the footer links", () => {
    expect(html).toContain("LOXA");
    expect(html).toContain('href="/terms"');
  });

  it("says there is no account", () => {
    expect(html).toContain("no sign-up");
  });

  it("says what happens to the photo", () => {
    expect(html).toContain("thirty days");
  });

  it("gives a contact address", () => {
    expect(html).toContain("mailto:hola@blankhexadecimal.com");
  });
});

describe("the terms", () => {
  const html = renderToStaticMarkup(<Terms />);

  it("carries the wordmark and the footer links", () => {
    expect(html).toContain("LOXA");
    expect(html).toContain('href="/privacy-policy"');
  });

  it("is honest that the result is an illustration", () => {
    expect(html).toContain("not a promise");
  });

  it("states the credit rules the app enforces", () => {
    expect(html).toContain("do not carry over");
    expect(html).toContain("$0.99");
  });
});
