import type { Metadata } from "next";
import "@/modules/main/styles/globals.css";
import Favicon from '@/modules/main/public/favicon.ico';

export const metadata: Metadata = {
  title: "Nudgio",
  description: "Ecommerce Recommendation Engine",
};

function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          try {
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark')
            } else {
              document.documentElement.classList.remove('dark')
            }
          } catch (e) {}
        `,
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* App Bridge API key — must appear before App Bridge script on all routes */}
        <meta name="shopify-api-key" content="37b4b12ed793e4127ba69f5e8d5f5922" />
        {/* App Bridge — must be synchronous per Shopify requirements */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
        <ThemeScript />
        <link rel='icon' href={Favicon.src} />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
