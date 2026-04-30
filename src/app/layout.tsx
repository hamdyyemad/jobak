// Providers
import { RootProvider } from "@/frontend/providers";

// STYLES
import { geistSans, geistMono } from "@/frontend/lib";
import "./globals.css";

// SEO
import { jobakMetadata, jobakViewport } from "@/frontend/lib";
export const metadata = jobakMetadata;
export const viewport = jobakViewport;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
