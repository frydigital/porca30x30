import { Header } from "@/components/header";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "30x30 Challenge - Track Your Daily Activity Streak",
  description: "Build your fitness habit with the 30x30 challenge. Exercise for at least 30 minutes every day for 30 days. Connect with Strava and compete on the leaderboard!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 bg-muted">{children}</main>
        </div>
      </body>
    </html>
  );
}
