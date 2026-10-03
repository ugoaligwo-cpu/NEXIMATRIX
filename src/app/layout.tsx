import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const font = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "Neximatrix.com",
    template: "%s - Neximatrix.com",
  },
  description:
    "Neximatrix.com account management for secure profiles, support, notifications, and activity history.",
  applicationName: "Neximatrix.com",
  icons: {
    icon: "/neximatrix-icon.png",
  },
  openGraph: {
    title: "Neximatrix.com",
    description:
      "Secure account management and support for Neximatrix.com users.",
    type: "website",
    images: ["/neximatrix-logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#181818" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${font.variable} h-full antialiased`}
    >
      <body
        id="app"
        className="min-h-full w-full bg-background text-foreground"
      >
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
