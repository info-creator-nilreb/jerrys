/**
 * Burger-Icon mit drei ungleich langen Strichen (Shopify/Edelweiss-Stil).
 */
export function StorefrontMenuIcon({ className = "w-6" }: { className?: string }) {
  return (
    <span
      className={`inline-flex flex-col items-start justify-center gap-[5px] ${className}`}
      aria-hidden
    >
      <span className="block h-[2px] w-full rounded-full bg-current" />
      <span className="block h-[2px] w-[70%] rounded-full bg-current" />
      <span className="block h-[2px] w-[88%] rounded-full bg-current" />
    </span>
  );
}
