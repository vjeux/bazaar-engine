import { StrictMode } from "react";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import "./globals.css";
import Navbar from "./navbar";

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
          <link
            rel="stylesheet"
            href="/src/styles.css"
          />
        </head>

        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex flex-col h-screen">
              <Navbar />
              {/* NOTE: Children have to handle overflow themselves */}
              <main className="flex-1 overflow-hidden">
                {children}
              </main>
            </div>
          </ThemeProvider>
        </body>
      </html>
    </StrictMode>
  );
}
