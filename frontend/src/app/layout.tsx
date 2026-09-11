import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Console — Extract structured leads from the public web",
  description: "Turn any public page into structured, exportable lead data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
