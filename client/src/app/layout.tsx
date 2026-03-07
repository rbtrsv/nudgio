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
        {/* App Bridge — Shopify embedded app communication (session tokens, navigation, toast).
            Must be the FIRST script tag, synchronous (no async/defer/type=module).
            Only initializes inside Shopify Admin iframe — no-op on other pages. */}
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
