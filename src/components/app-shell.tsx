"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/chat", label: "Chat", key: "C" },
  { href: "/memory", label: "Memory", key: "M" },
  { href: "/sources", label: "Sources", key: "S" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentPage = navigation.find((item) => item.href === pathname);

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link aria-label="Memory Vault home" className="brand" href="/chat">
          <span aria-hidden="true" className="brand-mark">
            mv
          </span>
          <span>Memory Vault</span>
        </Link>

        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Primary navigation" className="primary-nav">
          {navigation.map((item) => {
            const isCurrentPage = pathname === item.href;

            return (
              <Link
                aria-current={isCurrentPage ? "page" : undefined}
                className="nav-link"
                href={item.href}
                key={item.href}
              >
                <span aria-hidden="true" className="nav-key">
                  {item.key}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <span aria-hidden="true" className="footer-mark" />
          <span>Local workspace</span>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div>
            <p className="topbar-context">Memory Vault / Workspace</p>
            <h1 className="topbar-title">{currentPage?.label ?? "Workspace"}</h1>
          </div>
          <span className="prototype-badge">MVP scaffold</span>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}