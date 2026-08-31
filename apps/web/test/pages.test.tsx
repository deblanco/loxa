import { HAIR_COLORS, HAIR_STYLES, WEEKLY_CREDITS } from "@loxa/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Home from "../app/page";
import PrivacyPolicy from "../app/privacy-policy/page";
import Terms from "../app/terms/page";

/**
 * The pages as markup.
 *
 * Server Components rendered with `renderToStaticMarkup`, which is enough to
 * assert the two things that actually matter here: the legal pages exist and
 * link back (App Store review checks both URLs), and the landing page counts
 * and prices what the app actually ships.
 */
describe("the landing page", () => {
  const html = renderToStaticMarkup(<Home />);

  it("counts the styles rather than showing them", () => {
    expect(html).toContain(`${HAIR_STYLES.length} cuts`);
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

  it("states the introductory week beside the price it becomes", () => {
    // A first week at $0.99 is only honest next to the $9.99 that follows it.
    expect(html).toContain("First week $0.99");
    expect(html).toContain("Cancel anytime");
  });

  it("asks the bucket for nothing, host set or not", async () => {
    // The page's pictures ship with it. Nothing here waits on a generator run,
    // so a bucket that is empty — or a host that is unset — changes no pixel.
    expect(html).not.toContain("/styles/");

    vi.stubEnv("NEXT_PUBLIC_ASSETS_URL", "https://assets.example/");
    vi.resetModules();
    const { default: Page } = await import("../app/page");
    const withArt = renderToStaticMarkup(<Page />);
    vi.unstubAllEnvs();
    vi.resetModules();

    expect(withArt).not.toContain("assets.example");
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

  it("says the introductory price is offered once", () => {
    // The sentence App Store review looks for, and the one a resubscriber who
    // was charged $9.99 in their first week would otherwise be right to dispute.
    expect(html).toContain("once per Apple ID");
  });
});
