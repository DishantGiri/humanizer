import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";
import { Toaster } from "@/components/ui/toast";
import DynamicSeo from "@/components/DynamicSeo";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const viewport: Viewport = {
  themeColor: "#090a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://cloakwriter.app"),
  title: {
    default: "CloakWriter AI - #1 Free AI Humanizer & AI Text Converter",
    template: "%s | CloakWriter AI",
  },
  description:
    "Transform AI-generated content from ChatGPT, Claude & Gemini into natural, human-written text. Bypass leading AI detectors like Turnitin, ZeroGPT, CopyLeaks & GPTZero with 100% meaning preservation.",
  keywords: [
    "CloakWriter",
    "AI humanizer",
    "bypass Turnitin AI detection",
    "humanize ChatGPT text",
    "AI text converter",
    "ZeroGPT bypass tool",
    "CopyLeaks bypass",
    "GPTZero humanizer",
    "text rewriter",
    "free AI paraphraser",
    "natural human writing",
  ],
  authors: [{ name: "CloakWriter Team", url: "https://cloakwriter.app" }],
  creator: "CloakWriter AI",
  publisher: "CloakWriter AI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "CloakWriter AI - #1 Free AI Humanizer & AI Text Converter",
    description:
      "Transform AI-generated content into natural human writing. Bypass Turnitin, ZeroGPT, and CopyLeaks effortlessly.",
    url: "https://cloakwriter.app",
    siteName: "CloakWriter AI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CloakWriter AI - The Ultimate AI Text Humanizer",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CloakWriter AI - #1 Free AI Humanizer",
    description:
      "Transform ChatGPT, Claude, and Gemini text into authentic human writing. Bypass AI detectors with 100% factual accuracy.",
    images: ["/og-image.png"],
    creator: "@cloakwriter",
  },
  alternates: {
    canonical: "https://cloakwriter.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('humyn_theme')||'system';var d=s==='dark'||(s==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <DynamicSeo pageSlug="global" />
        <Providers>{children}</Providers>
        <Toaster />
        {/* Razorpay Checkout loaded lazily when browser is idle */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
