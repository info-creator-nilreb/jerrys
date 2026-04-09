import { AppSessionProvider } from "@/components/providers/session-provider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppSessionProvider>{children}</AppSessionProvider>;
}
