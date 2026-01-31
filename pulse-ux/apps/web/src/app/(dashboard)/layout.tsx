"use client";

/**
 * Dashboard layout with sidebar navigation.
 * Light theme, Detail.dev-inspired clean aesthetic.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  FlaskConical,
  Globe,
  Settings,
  Mail,
  LogOut,
} from "lucide-react";
import { getTokens, clearTokens } from "@/lib/api-client";

const navItems = [
  {
    title: "Experiments",
    icon: FlaskConical,
    href: "/experiments",
  },
  {
    title: "Sites",
    icon: Globe,
    href: "/sites",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const { accessToken } = getTokens();
    if (!accessToken) {
      router.push("/login");
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    clearTokens();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Header with org switcher */}
        <div className="h-16 border-b border-sidebar-border flex items-center px-4">
          <button className="flex items-center gap-2 w-full text-left hover:bg-sidebar-accent rounded-md px-2 py-1.5">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold">P</span>
            </div>
            <span className="font-medium truncate flex-1">My Organization</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4 space-y-1">
          <Link
            href="mailto:support@pulse-ux.com"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <Mail className="h-4 w-4" />
            Contact Support
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full text-left"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
