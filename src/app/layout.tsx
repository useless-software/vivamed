import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { t } from "@/lib/messages";
import { themeScript } from "@/lib/seasons";

export const metadata: Metadata = {
  title: { default: t.app.name, template: `%s · ${t.app.name}` },
  description: t.app.tagline,
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: lo script qui sotto aggiunge attributi a <html> prima di React.
    <html lang="it" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Tema delle feste applicato prima del primo disegno, senza lampi di colore. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
