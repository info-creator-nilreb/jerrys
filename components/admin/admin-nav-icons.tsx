import {
  Bell,
  ChevronLeft,
  ChevronUp,
  Home,
  LayoutGrid,
  Search,
  ShoppingBag,
  Store,
  Truck,
  Users,
} from "lucide-react";

const stroke = 1.6;

export function IconDashboard({ className }: { className?: string }) {
  return <Home className={className} aria-hidden strokeWidth={stroke} />;
}

export function IconCatalog({ className }: { className?: string }) {
  return <LayoutGrid className={className} aria-hidden strokeWidth={stroke} />;
}

export function IconShipping({ className }: { className?: string }) {
  return <Truck className={className} aria-hidden strokeWidth={stroke} />;
}

export function IconOrders({ className }: { className?: string }) {
  return <ShoppingBag className={className} aria-hidden strokeWidth={stroke} />;
}

export function IconCustomers({ className }: { className?: string }) {
  return <Users className={className} aria-hidden strokeWidth={stroke} />;
}

export function IconChevronLeft({ className }: { className?: string }) {
  return <ChevronLeft className={className} aria-hidden strokeWidth={1.8} />;
}

export function IconChevronUp({ className }: { className?: string }) {
  return <ChevronUp className={className} aria-hidden strokeWidth={1.8} />;
}

export function IconSearch({ className }: { className?: string }) {
  return <Search className={className} aria-hidden strokeWidth={stroke} />;
}

export function IconBell({ className }: { className?: string }) {
  return <Bell className={className} aria-hidden strokeWidth={stroke} />;
}

export function IconStorefront({ className }: { className?: string }) {
  return <Store className={className} aria-hidden strokeWidth={stroke} />;
}
