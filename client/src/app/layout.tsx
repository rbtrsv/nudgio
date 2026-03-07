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
        {/* App Bridge API key — required for App Bridge CDN to initialize.
            Value = client_id from shopify.app.toml (Shopify Partner Dashboard).
            App Bridge reads this meta tag to know which app it belongs to. */}
        <meta name="shopify-api-key" content="37b4b12ed793e4127ba69f5e8d5f5922" />
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
