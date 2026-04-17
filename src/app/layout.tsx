import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Our Hero, Balthazar - Free Tickets Giveaway",
  description: "Enter to win free tickets to Our Hero, Balthazar",
  openGraph: {
    title: "Win Free Tickets to Our Hero, Balthazar",
    description: "Enter to win free movie tickets!",
    images: ["/assets/images/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/assets/images/favicon.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
