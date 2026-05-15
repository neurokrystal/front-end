"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

  useEffect(() => {
    // Check local storage for theme preference
    const storedTheme = localStorage.getItem('admin-theme');
    if (storedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }

    // Responsive collapse
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    <div className="admin-panel flex h-screen overflow-hidden bg-[#F8FAFC] text-[#1E293B] dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-300 transition-all duration-300",
        isCollapsed ? "w-20" : "w-60",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
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

        {/* Admin Footer */}
        <div className="p-4 border-t border-slate-800 shrink-0">
           <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
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
        "flex-1 flex flex-col overflow-hidden transition-all duration-300",
        "lg:ml-60",
        isCollapsed && "lg:ml-20"
      )}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden shrink-0" 
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
               <nav className="flex items-center gap-1.5 text-sm mb-0.5">
                  <span className="text-slate-400">Admin</span>
                  {breadcrumbs.filter(c => c.label !== 'Admin').map((crumb, i) => (
                    <React.Fragment key={crumb.href}>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      <span className={cn(
                        crumb.active ? "text-slate-700 font-medium" : "text-slate-400"
                      )}>
                        {crumb.label}
                      </span>
                    </React.Fragment>
                  ))}
               </nav>
               <h1 className="text-xl font-semibold text-slate-900 tracking-tight truncate">
                  {breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard"}
               </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <div className="flex items-center gap-2.5 pl-2 cursor-pointer group">
               <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{user.name}</p>
                  <p className="text-xs text-slate-400 uppercase tracking-tight">Platform Admin</p>
               </div>
               <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600 shrink-0 group-hover:ring-2 group-hover:ring-blue-500/20 transition-all">
                 {user.name.charAt(0)}
               </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC] transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}
