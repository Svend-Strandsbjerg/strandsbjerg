import type { Metadata } from "next";
import "@/app/globals.css";
import { PublicPageShell } from "@/components/layout/public-shell";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/layout/theme-provider";


export const metadata: Metadata = {
  title: "Strandsbjerg | Software Development & Architecture",
  description:
    "Professional profile focused on software engineering, architecture, integration reliability, and maintainable modernization.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <PublicPageShell>{children}</PublicPageShell>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
