"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRingIcon,
  CalendarDaysIcon,
  DoorOpenIcon,
  HouseIcon,
  SettingsIcon,
  UserCogIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  home: HouseIcon,
  reminders: BellRingIcon,
  settings: SettingsIcon,
  agenda: CalendarDaysIcon,
  patients: UsersIcon,
  rooms: DoorOpenIcon,
  users: UserCogIcon,
};

export type NavItem = { href: string; label: string; icon: keyof typeof icons };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active =
          item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-sidebar-accent",
              active && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
