import { StrictMode } from "react";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import "./globals.css";
import Navbar from "./navbar";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StrictMode>
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta title="Bazaar Engine" />
          <script src="https://unpkg.com/react-scan/dist/auto.global.js" />
          {/* React scan */}
        </head>

        <body className="min-h-screen bg-red-500">
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
