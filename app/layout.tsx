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

        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NuqsAdapter>
              <div className="flex h-screen flex-col">
                <Navbar />
                {/* NOTE: Children have to handle overflow themselves */}
                <main className="flex-1 overflow-hidden">{children}</main>
              </div>
            </NuqsAdapter>
          </ThemeProvider>
        </body>
      </html>
    </StrictMode>
  );
}
