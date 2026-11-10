import Image from "next/image";
import { t } from "@/lib/messages";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Image src="/logo.png" alt="" width={72} height={72} priority />
          <p className="text-2xl font-semibold tracking-tight">{t.app.name}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
