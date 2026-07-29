import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Humyn - Rewrite Text Naturally",
  description:
    "Transform AI-generated or awkward text into natural, human-sounding writing. Supports academic, professional, casual, and 6 more styles with meaning preservation.",
  keywords: ["Humyn", "AI humanizer", "text rewriter", "paraphraser", "writing tool", "natural writing"],
  openGraph: {
    title: "Humyn - Rewrite Text Naturally",
    description:
      "Transform text into natural, human-sounding writing with AI-powered rewriting.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
