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
        <ThemeScript />
        <link rel='icon' href={Favicon.src} />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
