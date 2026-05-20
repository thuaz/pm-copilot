"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Monitor,
  Mic,
  StickyNote,
  ArrowRightLeft,
  Settings,
  Menu,
  X,
  MessageCircleHeart,
} from "lucide-react";

const navItems = [
  { href: "/", label: "工作台", icon: LayoutDashboard },
  { href: "/recording", label: "录音分析", icon: Mic },
  { href: "/comm-guide", label: "沟通教练", icon: MessageCircleHeart },
  { href: "/terms", label: "医学术语", icon: BookOpen },
  { href: "/prd", label: "PRD 生成", icon: FileText },
  { href: "/prototype", label: "原型生成", icon: Monitor },
  { href: "/notes", label: "会议记录", icon: StickyNote },
  { href: "/dev-comm", label: "开发沟通", icon: ArrowRightLeft },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const NavLinks = () => (
    <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive
                ? "bg-[var(--color-accent)] text-[var(--color-sidebar-active)] font-medium"
                : "text-[var(--color-sidebar-foreground)] hover:bg-gray-100"
            }`}
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            {item.label}
          </Link>
        );
      })}
      <div className="border-t border-[var(--color-border)] my-2" />
      <Link
        href="/settings"
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
          pathname === "/settings"
            ? "bg-[var(--color-accent)] text-[var(--color-sidebar-active)] font-medium"
            : "text-[var(--color-sidebar-foreground)] hover:bg-gray-100"
        }`}
      >
        <Settings className="w-[18px] h-[18px] shrink-0" />
        设置
      </Link>
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--color-sidebar)] border-b border-[var(--color-border)] flex items-center justify-between px-4 z-50">
        <h1 className="text-base font-bold">PM Copilot</h1>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile slide-out menu */}
      <div
        className={`lg:hidden fixed top-14 left-0 bottom-0 w-64 bg-[var(--color-sidebar)] border-r border-[var(--color-border)] flex flex-col z-50 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            PM 助手
          </p>
        </div>
        <NavLinks />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-56 bg-[var(--color-sidebar)] border-r border-[var(--color-border)] flex-col z-50">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h1 className="text-lg font-bold text-[var(--color-foreground)]">
            PM Copilot
          </h1>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            PM 助手
          </p>
        </div>
        <NavLinks />
      </aside>
    </>
  );
}
