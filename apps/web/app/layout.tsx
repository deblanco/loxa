import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

/**
 * Self-hosted through `next/font`, not a `<link>` to Google.
 *
 * A stylesheet request to fonts.googleapis.com on every page load is a render
 * block and a third party watching the visitor. `next/font` serves the files
 * from our own origin.
 */
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument-sans",
});

export const metadata: Metadata = {
  // The share card lives at `app/opengraph-image.png`, and Next turns that file
  // into an absolute URL — which it can only do against a base. Without this it
  // falls back to localhost, and every shared link points at the sharer's own
  // machine. This Worker answers on one hostname; it is that one.
  metadataBase: new URL("https://loxa.blankhexadecimal.com"),
  title: "Loxa — try on any hair before the scissors",
  description:
    "Pick a cut and a colour and see it on your own face in seconds. An iOS app.",
  openGraph: {
    title: "Loxa",
    description: "Try on any hair before the scissors.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
