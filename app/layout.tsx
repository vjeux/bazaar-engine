import { StrictMode } from "react";
import "./globals.css";
import Navbar from "./navbar";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ReactScan } from "@/components/ReactScan";
import Providers from "@/components/Providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StrictMode>
      <html lang="en" suppressHydrationWarning>
        <ReactScan />
        <head>
          <title>Bazaar Engine</title>
        </head>

        <body className="min-h-screen">
          <Providers>
            <NuqsAdapter>
              <Navbar />
              <main>{children}</main>
            </NuqsAdapter>
          </Providers>
        </body>
      </html>
    </StrictMode>
  );
}
