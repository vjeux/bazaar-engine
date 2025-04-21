import { StrictMode } from "react";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import "./globals.css";
import Navbar from "./navbar";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ReactScan } from "@/components/ReactScan";

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
          <meta title="Bazaar Engine" />
        </head>

        <body className="min-h-screen">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NuqsAdapter>
              <Navbar />
              <main>{children}</main>
            </NuqsAdapter>
          </ThemeProvider>
        </body>
      </html>
    </StrictMode>
  );
}
