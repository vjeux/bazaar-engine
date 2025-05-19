// This component must be the top-most import in this file! according to ReactScan docs at https://github.com/aidenybai/react-scan/blob/main/docs/installation/next-js-app-router.md
import { ReactScan } from "@/components/ReactScan";
import { StrictMode } from "react";
import "./globals.css";
import Navbar from "./navbar";
import { NuqsAdapter } from "nuqs/adapters/next/app";
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
