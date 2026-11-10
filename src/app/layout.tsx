import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { t } from "@/lib/messages";

export const metadata: Metadata = {
  title: { default: t.app.name, template: `%s · ${t.app.name}` },
  description: t.app.tagline,
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
