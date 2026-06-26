"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Receipt,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Users,
  MessageCircle,
  Menu,
  X,
  Gem,
} from "lucide-react";
import { getRoleLabel } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agendamentos", label: "Agendamentos", icon: Calendar },
  { href: "/comandas", label: "Comandas", icon: Receipt },
  { href: "/anamnese", label: "Anamnese", icon: FileText },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

const adminItems = [
  { href: "/admin", label: "Administração", icon: Settings },
  { href: "/admin/tatuadores", label: "Tatuadores", icon: Users },
  { href: "/admin/perfuradores", label: "Body Pierce", icon: Gem },
  { href: "/admin/procedimentos", label: "Procedimentos", icon: Gem },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavLink = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
  }) => {
    const active =
      pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
          active
            ? "bg-[var(--primary)] text-black font-medium"
            : "text-[var(--muted)] hover:bg-white/5 hover:text-white"
        }`}
      >
        <Icon size={20} />
        {label}
      </Link>
    );
  };

  const sidebarContent = (
    <>
      <div className="p-4 md:p-6 border-b border-[var(--card-border)]">
        <Link href="/dashboard" className="flex justify-center" onClick={() => setMobileOpen(false)}>
          <Logo size="md" />
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Admin
              </p>
            </div>
            {adminItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-[var(--card-border)]">
        <div className="mb-3 px-3">
          <p className="font-medium text-sm">{session?.user?.name}</p>
          <p className="text-xs text-[var(--muted)]">
            {session?.user?.role
              ? getRoleLabel(session.user.role)
              : ""}
            {(session?.user?.role === "ARTIST" ||
              session?.user?.role === "PIERCER") &&
              ` • ${session.user.commissionRate}%`}
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-[var(--muted)] hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut size={20} />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--card)] border-b border-[var(--card-border)] px-4 py-2 flex items-center justify-between">
        <Link href="/dashboard">
          <Logo size="sm" />
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-white/5"
          aria-label="Menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[var(--card)] border-r border-[var(--card-border)] flex flex-col transform transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
