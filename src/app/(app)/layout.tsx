import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LogOutIcon } from "lucide-react";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/messages";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { logout } from "@/server/actions/auth";
import { PreferencesSync } from "@/components/theme/preferences-sync";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-2 bg-sidebar p-3 text-sidebar-foreground md:sticky md:top-0 md:h-dvh md:w-56">
        <Link href="/" className="flex items-center gap-2 px-2 py-1 text-lg font-semibold">
          <Image src="/logo.png" alt="" width={32} height={32} priority />
          <span className="season-badge">{t.app.name}</span>
        </Link>
        {/* Menu e utente dipendono dalla sessione: arrivano in streaming. */}
        <Suspense fallback={null}>
          <SessionNav />
        </Suspense>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}

async function SessionNav() {
  const user = await requireUser();
  const items: NavItem[] = [
    { href: "/", label: t.nav.home, icon: "home" },
    { href: "/agenda", label: t.nav.agenda, icon: "agenda" },
    { href: "/promemoria", label: t.nav.reminders, icon: "reminders" },
    { href: "/pazienti", label: t.nav.patients, icon: "patients" },
  ];
  if (can(user.role, "rooms.manage")) items.push({ href: "/sale", label: t.nav.rooms, icon: "rooms" });
  if (can(user.role, "users.manage")) items.push({ href: "/utenti", label: t.nav.users, icon: "users" });
  if (can(user.role, "settings.manage")) items.push({ href: "/impostazioni", label: t.nav.settings, icon: "settings" });
  const settings = await getSettings();

  return (
    <>
      <PreferencesSync seasonalThemes={settings.seasonalThemes} confetti={settings.confetti} />
      <NavLinks items={items} />
      <div className="flex items-center gap-1 border-sidebar-border md:mt-auto md:border-t md:pt-3">
        <Link href="/profilo" className="min-w-0 flex-1 rounded-lg px-2 py-1 hover:bg-sidebar-accent">
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span className="block text-xs opacity-70">{t.roles[user.role]}</span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            title={t.nav.logout}
            aria-label={t.nav.logout}
            className="rounded-lg p-2 hover:bg-sidebar-accent"
          >
            <LogOutIcon className="size-4" />
          </button>
        </form>
      </div>
    </>
  );
}
