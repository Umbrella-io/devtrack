import CustomCursor from "@/components/CustomCursor";
import type { Metadata, Viewport } from "next";
import { Inter, Syne, JetBrains_Mono } from "next/font/google";
import AppNavbar from "@/components/AppNavbar";
import Footer from "@/components/Footer";
import DeferredVercelMetrics from "@/components/DeferredVercelMetrics";
import Providers from "./providers";
import OfflineBanner from "@/components/OfflineBanner";
import "./globals.css";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from "next-intl";
import { getLocaleDirection } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/locale";
import { getMessagesForLocale } from "@/i18n/messages";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["700", "800"],
  display: "swap",
  preload: false,
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "600", "700"],
  display: "optional",
  preload: false,
});

export const metadata: Metadata = {
  title: "DevTrack — Developer Productivity Dashboard",
  description:
    "Track coding habits, visualize GitHub contributions, and hit your goals.",

  manifest: "/manifest.json",

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  appleWebApp: {
    capable: true,
    title: "DevTrack",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getRequestLocale();
  const messages = await getMessagesForLocale(locale);

  return (
    <html lang={locale} dir={getLocaleDirection(locale)} suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('theme');
                  const validThemes = ['classic-dark', 'modern-light-blue', 'nordic-frost', 'cyberpunk-matrix'];
                  const theme = validThemes.includes(stored || '') ? stored : 'classic-dark';
                  const isDark = theme !== 'modern-light-blue';

                  document.documentElement.dataset.theme = theme;
                  document.documentElement.classList.toggle('dark', isDark);
                  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>

      <body
        className={`${inter.className} min-h-screen bg-[var(--background)] text-[var(--foreground)]`}
      >
        <CustomCursor />
        <OfflineBanner />

        <div className="flex min-h-screen flex-col">
          <div className="flex-1">
            <NextIntlClientProvider locale={locale} messages={messages}>
              <Providers>
                <AppNavbar />
                {children}
              </Providers>
            </NextIntlClientProvider>
          </div>

          <Footer />

          <Toaster richColors position="top-right" />
        </div>
        <DeferredVercelMetrics />
      </body>
    </html>
  );
}
