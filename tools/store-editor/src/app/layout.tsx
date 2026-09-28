import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, Rubik } from "next/font/google";
import "./globals.css";

const font = Inter({ subsets: ["latin"] });
// Candy Pop Social: chunky display headline + Rubik for bubbles, pills and tags.
const display = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz"], variable: "--font-display" });
const ui = Rubik({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-ui" });

export const metadata: Metadata = {
  title: "App Store Screenshots",
  description: "Design and export App Store + Google Play screenshots.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${font.className} ${display.variable} ${ui.variable}`}>{children}</body>
    </html>
  );
}
