"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  IconCatalog,
  IconChevronLeft,
  IconChevronUp,
  IconCustomers,
  IconDashboard,
  IconOrders,
  IconPromotions,
  IconShipping,
  IconStorefront,
} from "@/components/admin/admin-nav-icons";

const STORAGE_KEY = "jerrys-admin-sidebar-collapsed";

const NAVY = "#182d4d";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const mainNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: IconDashboard },
  { href: "/admin/startseite", label: "Startseite", icon: IconStorefront },
  { href: "/admin/products", label: "Katalog", icon: IconCatalog },
  { href: "/admin/promotions", label: "Promotions", icon: IconPromotions },
  { href: "/admin/versand", label: "Versand", icon: IconShipping },
  { href: "/admin/orders", label: "Bestellungen", icon: IconOrders },
  { href: "/admin/customers", label: "Kunden", icon: IconCustomers },
];

function userInitials(name: string, email: string): string {
  const n = name.trim();
  if (n.includes(" ")) {
    const p = n.split(/\s+/).filter(Boolean);
    return (p[0]![0]! + (p[1]?.[0] ?? "")).toUpperCase();
  }
  const local = email.split("@")[0] ?? "A";
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

export function AdminSidebar({
  collapsed,
  onToggleCollapsed,
  appVersion,
  userEmail,
  userName,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  appVersion: string;
  userEmail: string;
  userName: string;
}) {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(ev: MouseEvent) {
      if (!userMenuRef.current?.contains(ev.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const initials = userInitials(userName || userEmail, userEmail);
  const displayName =
    userName.trim() ||
    (userEmail.includes("@")
      ? userEmail
          .split("@")[0]!
          .split(/[._-]/)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" ")
      : userEmail);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className="flex h-dvh shrink-0 flex-col border-r border-black/10 transition-[width] duration-200 ease-out"
      style={{
        width: collapsed ? "4.25rem" : "15.5rem",
        backgroundColor: NAVY,
      }}
    >
      <div className="border-b border-white/10 px-3 py-4">
        {collapsed ? (
          <div className="flex justify-center px-0.5" title="jerry's Admin">
            <Image
              src="/branding/jerrys-logo-white.png"
              alt=""
              width={72}
              height={72}
              className="h-9 w-auto max-w-[2.75rem] object-contain"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="relative h-11 w-[5.25rem] shrink-0">
              <Image
                src="/branding/jerrys-logo-white.png"
                alt=""
                fill
                className="object-contain object-left"
                sizes="120px"
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">Administration</p>
                <span
                  className="size-2 shrink-0 rounded-full bg-primary"
                  title="Verbunden"
                  aria-hidden
                />
              </div>
              <p className="text-xs text-white/50">v{appVersion}</p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto py-3" aria-label="Hauptnavigation">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex w-full items-center gap-3 py-2.5 text-sm transition-colors ${
                collapsed ? "justify-center px-0" : "px-3"
              } ${
                active
                  ? "border-l-2 border-primary bg-primary/15 font-medium text-white"
                  : "border-l-2 border-transparent text-white/70 hover:bg-white/5 hover:text-white/90"
              }`}
            >
              <Icon className="size-[1.35rem] shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 py-2">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={`flex w-full items-center gap-2 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white/90 ${collapsed ? "justify-center px-0" : "px-3"}`}
          title={collapsed ? "Menü aufklappen" : undefined}
        >
          <IconChevronLeft
            className={`size-5 shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
          {!collapsed ? <span>Menü einklappen</span> : null}
        </button>
      </div>

      <div ref={userMenuRef} className="relative border-t border-white/10 p-2">
        <button
          type="button"
          onClick={() => setUserMenuOpen((o) => !o)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5 ${collapsed ? "justify-center px-1" : ""}`}
          aria-expanded={userMenuOpen}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white ring-2 ring-white/20">
            {initials}
          </span>
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{displayName}</p>
                <p className="truncate text-xs font-medium text-primary">Administrator</p>
              </div>
              <IconChevronUp
                className={`size-4 shrink-0 text-white/50 transition-transform ${userMenuOpen ? "" : "rotate-180"}`}
              />
            </>
          ) : null}
        </button>
        {userMenuOpen ? (
          <div
            className={`absolute bottom-full left-2 right-2 z-20 mb-1 rounded-lg border border-white/10 bg-[#1f3a5c] py-1 shadow-lg ${collapsed ? "left-1 right-1" : ""}`}
          >
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
            >
              Abmelden
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  // Nach Hydration: persistierten Zustand lesen (SSR bleibt zunächst ausgeklappt).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- bewusst nach Mount, kein useSyncExternalStore nötig
        setCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return { collapsed, toggle };
}
