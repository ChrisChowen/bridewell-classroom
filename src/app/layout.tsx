import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bridewell Classroom",
  description:
    "The integrated teacher and student AI tutor for the Bridewell Schools — King Edward's Witley, Barrow Hills, and Longacre.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/crest.png", sizes: "any", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

// Apply the saved theme BEFORE first paint, on every route. The theme
// toggles (HomepageHeader / UserMenu) only mount on some surfaces, so
// previously the dark choice didn't carry to /login, /join, etc. This
// blocking inline script reads the persisted choice and sets the
// attribute on <html> before the body renders — no flash, all pages.
const THEME_INIT = `try{var t=localStorage.getItem('bw-theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-GB"
      className={`${sans.variable} ${serif.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
