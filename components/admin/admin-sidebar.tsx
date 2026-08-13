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
  IconContents,
  IconCustomers,
  IconDashboard,
  IconEmails,
  IconOrders,
  IconPromotions,
  IconSettings,
  IconShipping,
  IconWorkshops,
} from "@/components/admin/admin-nav-icons";

const STORAGE_KEY = "jerrys-admin-sidebar-collapsed";

const NAVY = "#182d4d";

type NavChild = {
  href: string;
  label: string;
  /** Wenn gesetzt: aktive Markierung statt Prefix-Match auf href. */
  isActivePath?: (pathname: string) => boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  children?: NavChild[];
  /** Wenn gesetzt: aktive Markierung des Überpunkts statt Prefix-Match auf href. */
  isActivePath?: (pathname: string) => boolean;
};

function isInhaltePagesPath(pathname: string): boolean {
  if (pathname === "/admin/inhalte") return true;
  if (pathname.startsWith("/admin/inhalte/marketing")) return false;
  return pathname.startsWith("/admin/inhalte/");
}

function isKatalogPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin/products") ||
    pathname.startsWith("/admin/collections") ||
    pathname.startsWith("/admin/categories") ||
    pathname.startsWith("/admin/bestand")
  );
}

/**
 * Shopify-ähnliche Admin-IA: operative Bereiche (Bestellungen, Termine, Katalog, Kunden)
 * oben; Inhalte/Marketing und Shop-spezifika darunter; Einstellungen am Ende.
 */
const mainNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: IconDashboard },
  { href: "/admin/orders", label: "Bestellungen", icon: IconOrders },
  { href: "/admin/termine", label: "Termine", icon: IconWorkshops },
  {
    href: "/admin/products",
    label: "Katalog",
    icon: IconCatalog,
    isActivePath: isKatalogPath,
    children: [
      {
        href: "/admin/products",
        label: "Produkte",
        isActivePath: (pathname) =>
          pathname.startsWith("/admin/products") &&
          !pathname.startsWith("/admin/products/shopify-import") &&
          !pathname.startsWith("/admin/products/import"),
      },
      {
        href: "/admin/products/shopify-import",
        label: "Shopify-Import",
        isActivePath: (pathname) =>
          pathname.startsWith("/admin/products/shopify-import") ||
          pathname.startsWith("/admin/products/import"),
      },
      {
        href: "/admin/collections",
        label: "Kollektionen",
        isActivePath: (pathname) => pathname.startsWith("/admin/collections"),
      },
      {
        href: "/admin/categories",
        label: "Kategorien",
        isActivePath: (pathname) => pathname.startsWith("/admin/categories"),
      },
      {
        href: "/admin/bestand",
        label: "Bestand",
        isActivePath: (pathname) => pathname.startsWith("/admin/bestand"),
      },
    ],
  },
  { href: "/admin/customers", label: "Kunden", icon: IconCustomers },
  {
    href: "/admin/inhalte",
    label: "Inhalte",
    icon: IconContents,
    children: [
      {
        href: "/admin/inhalte",
        label: "Seiten",
        isActivePath: isInhaltePagesPath,
      },
      {
        href: "/admin/inhalte/marketing",
        label: "Marketing",
        isActivePath: (pathname) => pathname.startsWith("/admin/inhalte/marketing"),
      },
    ],
  },
  { href: "/admin/promotions", label: "Promotions", icon: IconPromotions },
  { href: "/admin/emails", label: "E-Mails", icon: IconEmails },
  { href: "/admin/versand", label: "Versand", icon: IconShipping },
  {
    href: "/admin/einstellungen",
    label: "Einstellungen",
    icon: IconSettings,
    isActivePath: (pathname) => pathname.startsWith("/admin/einstellungen"),
    children: [
      {
        href: "/admin/einstellungen",
        label: "Shop",
        isActivePath: (pathname) =>
          pathname === "/admin/einstellungen" ||
          (pathname.startsWith("/admin/einstellungen/") &&
            !pathname.startsWith("/admin/einstellungen/integrationen")),
      },
      {
        href: "/admin/einstellungen/integrationen",
        label: "Integrationen",
        isActivePath: (pathname) => pathname.startsWith("/admin/einstellungen/integrationen"),
      },
    ],
  },
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
  termineEnabled = true,
  mobileOpen = false,
  onNavigate,
  className = "",
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  appVersion: string;
  userEmail: string;
  userName: string;
  /** Shop-Feature-Flag: Menüpunkt Termine. */
  termineEnabled?: boolean;
  /** Off-canvas auf Viewports &lt; lg */
  mobileOpen?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navItems = termineEnabled
    ? mainNav
    : mainNav.filter((item) => item.href !== "/admin/termine");

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

  function itemActive(item: NavItem) {
    if (item.isActivePath) return item.isActivePath(pathname);
    if (item.href === "/admin") return pathname === "/admin";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function childActive(child: NavChild) {
    if (child.isActivePath) return child.isActivePath(pathname);
    return pathname === child.href || pathname.startsWith(`${child.href}/`);
  }

  const showLabels = !collapsed || mobileOpen;

  return (
    <aside
      className={`flex h-dvh shrink-0 flex-col border-r border-black/10 transition-[width] duration-200 ease-out ${className}`}
      style={{
        width: collapsed && !mobileOpen ? "4.25rem" : "15.5rem",
        backgroundColor: NAVY,
      }}
    >
      <div className="border-b border-white/10 px-3 py-4">
        {collapsed && !mobileOpen ? (
          <div
            className="flex justify-center px-0.5"
            title={`jerry's Admin ${appVersion.startsWith("v") ? appVersion : `v${appVersion}`}`}
          >
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
              <p className="text-xs text-white/50" title={`Version ${appVersion}`}>
                {appVersion.startsWith("v") ? appVersion : `v${appVersion}`}
              </p>
            </div>
          </div>
        )}
      </div>

      <nav
        className="flex flex-1 flex-col overflow-y-auto py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Hauptnavigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = itemActive(item);
          const children = item.children;
          const showChildren = Boolean(children?.length && showLabels);

          return (
            <div key={item.href} className="flex flex-col">
              <Link
                href={item.href}
                title={showLabels ? undefined : item.label}
                onClick={() => onNavigate?.()}
                className={`flex w-full min-h-11 items-center gap-3 py-2.5 text-sm transition-colors ${
                  showLabels ? "px-3" : "justify-center px-0"
                } ${
                  active
                    ? "border-l-2 border-primary bg-primary/15 font-medium text-white"
                    : "border-l-2 border-transparent text-white/70 hover:bg-white/5 hover:text-white/90"
                }`}
              >
                <Icon className="size-[1.35rem] shrink-0" />
                {showLabels ? <span className="truncate">{item.label}</span> : null}
              </Link>
              {showChildren ? (
                <ul className="mb-1 ml-3 border-l border-white/10 pb-1 pl-2" aria-label={`${item.label}-Untermenü`}>
                  {children!.map((child) => {
                    const childIsActive = childActive(child);
                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={() => onNavigate?.()}
                          className={`flex min-h-10 items-center rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                            childIsActive
                              ? "bg-primary/20 font-medium text-white"
                              : "text-white/60 hover:bg-white/5 hover:text-white/90"
                          }`}
                        >
                          <span className="truncate">{child.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="hidden border-t border-white/10 py-2 lg:block">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={`flex min-h-11 w-full items-center gap-2 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white/90 ${showLabels ? "px-3" : "justify-center px-0"}`}
          title={collapsed ? "Menü aufklappen" : undefined}
        >
          <IconChevronLeft
            className={`size-5 shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
          {showLabels ? <span>Menü einklappen</span> : null}
        </button>
      </div>

      <div ref={userMenuRef} className="relative border-t border-white/10 p-2">
        <button
          type="button"
          onClick={() => setUserMenuOpen((o) => !o)}
          className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5 ${showLabels ? "" : "justify-center px-1"}`}
          aria-expanded={userMenuOpen}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white ring-2 ring-white/20">
            {initials}
          </span>
          {showLabels ? (
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
