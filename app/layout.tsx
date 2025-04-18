import { StrictMode } from "react";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import "./globals.css";

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
            <div className="grid h-screen grid-rows-[auto_1fr]">
              <nav className="h-16">
                Test nav bar
              </nav>
              <main className="overflow-auto">
                {children}
              </main>
            </div>
          </ThemeProvider>
        </body>
      </html>
    </StrictMode>
  );
}
