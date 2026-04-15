import {
  adminTripleOptionLabel,
  adminTripleSelectSurfaceClass,
  type AdminTriple,
  type AdminTripleDimension,
} from "@/lib/orders/order-admin-triple";

export function OrderTriplePill({
  triple,
  dim,
  className = "",
}: {
  triple: AdminTriple;
  dim: AdminTripleDimension;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex max-w-full rounded-full px-2.5 py-0.5 text-xs font-medium ${adminTripleSelectSurfaceClass(dim, triple[dim])} ${className}`}
    >
      {adminTripleOptionLabel(dim, triple[dim])}
    </span>
  );
}
