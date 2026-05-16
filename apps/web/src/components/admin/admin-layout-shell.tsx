"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, FileEdit, FileText, Mail, FlaskConical, Settings, 
  Users, Building2, Briefcase, GraduationCap, Link as LinkIcon, 
  ClipboardList, CreditCard, Tag, Handshake, Package, RefreshCw, 
  Trash2, Menu, Bell, Sun, Moon, LogOut, User as UserIcon, ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { getTemplateLabel as getEmailTemplateLabel } from "@/lib/email-templates";
import { signOut } from "@/lib/auth-client";

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, section: 'Admin Panel' },
  { label: 'CMS Content Blocks', href: '/admin/cms', icon: FileEdit, section: 'CONTENT' },
  { label: 'Report Templates', href: '/admin/templates', icon: FileText, section: 'CONTENT' },
  { label: 'Email Templates', href: '/admin/email-templates', icon: Mail, section: 'CONTENT' },
  { label: 'Instruments', href: '/admin/instruments', icon: FlaskConical, section: 'INSTRUMENTS' },
  { label: 'Scoring Configs', href: '/admin/scoring-configs', icon: Settings, section: 'INSTRUMENTS' },
  { label: 'Users', href: '/admin/users', icon: Users, section: 'USERS & ORGS' },
  { label: 'Organisations', href: '/admin/organisations', icon: Building2, section: 'USERS & ORGS' },
  { label: 'Teams', href: '/admin/teams', icon: Briefcase, section: 'USERS & ORGS' },
  { label: 'Coaches & Certs', href: '/admin/coaches-certs', icon: GraduationCap, section: 'USERS & ORGS' },
  { label: 'Share Grants', href: '/admin/share-grants', icon: LinkIcon, section: 'SHARING & ACCESS' },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: ClipboardList, section: 'SHARING & ACCESS' },
  { label: 'Purchases', href: '/admin/purchases', icon: CreditCard, section: 'BILLING' },
  { label: 'Referral Codes', href: '/admin/referral-codes', icon: Tag, section: 'BILLING' },
  { label: 'Partner Orgs', href: '/admin/partner-orgs', icon: Handshake, section: 'BILLING' },
  { label: 'Asset Storage', href: '/admin/assets', icon: Package, section: 'SYSTEM' },
  { label: 'Bulk Operations', href: '/admin/bulk', icon: RefreshCw, section: 'SYSTEM' },
  { label: 'Deletion Requests', href: '/admin/deletion-requests', icon: Trash2, section: 'SYSTEM' },
];

export function AdminLayoutShell({ 
  children, 
  user 
}: { 
  children: React.ReactNode; 
  user: { name: string; role: string; email: string } 
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Check local storage for theme preference
    const storedTheme = localStorage.getItem('admin-theme');
    if (storedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }

    // Responsive collapse (collapse below md: 768px)
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile sidebar on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('admin-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('admin-theme', 'light');
    }
  };

  const sections = Array.from(new Set(navItems.map(item => item.section)));

  // Optional fetch for display name when hitting /admin/templates/[id]
  const [templateDisplayName, setTemplateDisplayName] = useState<string | null>(null);
  useEffect(() => {
    const parts = pathname.split('/').filter(Boolean);
    const idx = parts.findIndex(p => p === 'admin');
    if (idx !== -1 && parts[idx + 1] === 'templates' && parts[idx + 2]) {
      const id = parts[idx + 2];
      // Fetch template to display human name instead of UUID
      apiFetch<{ name: string }>(`/api/v1/admin/templates/${id}`)
        .then((r) => setTemplateDisplayName(r?.name || null))
        .catch(() => setTemplateDisplayName(null));
    } else {
      setTemplateDisplayName(null);
    }
  }, [pathname]);

  const breadcrumbs = pathname
    .split('/')
    .filter(Boolean)
    .map((part, i, arr) => {
      const isLast = i === arr.length - 1;
      const isTemplateId = arr[i - 1] === 'templates' && arr[i - 2] === 'admin';
      const isEmailTemplateId = arr[i - 1] === 'email-templates' && arr[i - 2] === 'admin';
      return {
        label: isTemplateId && templateDisplayName
          ? templateDisplayName
          : isEmailTemplateId
            ? getEmailTemplateLabel(part)
            : part.charAt(0).toUpperCase() + part.slice(1),
        href: '/' + arr.slice(0, i + 1).join('/'),
        active: isLast,
      };
    });

  return (
    <div className="admin-panel flex min-h-screen bg-[#F8FAFC] text-[#1E293B] dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-slate-900 text-slate-300 transition-all duration-300 border-r border-slate-800",
        isCollapsed ? "w-20" : "w-60",
        isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Logo Area */}
        <div className="px-5 py-5 flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0">D</div>
          {!isCollapsed && <span className="text-white font-semibold text-base tracking-tight truncate">Dimensional</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          {sections.map(section => (
            <div key={section} className="mb-6">
              {!isCollapsed && (
                <p className="px-5 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  {section}
                </p>
              )}
              {navItems.filter(item => item.section === section).map(item => {
                const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "mx-3 px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2.5 mb-0.5",
                      isActive 
                        ? "text-white bg-slate-800 font-medium" 
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    )}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", isCollapsed ? "mx-auto" : "", isActive ? "text-blue-400" : "")} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout / User Section */}
        <div className="mt-auto border-t border-slate-700/50 p-4">
          <button
            onClick={async () => {
              await signOut();
              router.push('/login');
            }}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors",
              isCollapsed && "justify-center"
            )}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span>Sign out</span>}
          </button>
          <div className={cn("mt-3 flex items-center gap-3", isCollapsed && "justify-center")}
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
              <div className="w-full h-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300">
                {user.name.charAt(0)}
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">{user.role}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col min-h-screen overflow-hidden transition-all duration-300",
        "md:ml-60",
        isCollapsed && "md:ml-20"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#0f1623]/80 backdrop-blur-sm border-b border-slate-800 px-4 md:px-6 py-3 flex items-center gap-4">
          {/* Hamburger button — mobile only */}
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-1 text-slate-400 hover:text-white md:hidden"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Breadcrumbs / Title */}
          <div className="flex items-center gap-2 text-sm text-slate-300">
            {breadcrumbs.map((bc, i) => (
              <React.Fragment key={bc.href}>
                {i > 0 && <span className="text-slate-600">/</span>}
                {bc.active ? (
                  <span className="text-white font-medium truncate max-w-[50vw] md:max-w-none">{bc.label}</span>
                ) : (
                  <Link href={bc.href} className="hover:text-white truncate max-w-[40vw] md:max-w-none">{bc.label}</Link>
                )}
              </React.Fragment>
            ))}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 bg-[#F8FAFC] transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}
