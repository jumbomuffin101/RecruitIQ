import Link from "next/link";
import {
  BarChart3,
  BriefcaseBusiness,
  Map,
  LayoutDashboard,
  Scale,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quick-start", label: "Quick Start", icon: Map },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Workflow },
  { href: "/compare", label: "Compare", icon: Scale },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/architecture", label: "Architecture", icon: Sparkles },
];

export function AppSidebar({ user }: { user: React.ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white/95 px-4 py-5 shadow-[8px_0_30px_rgba(15,23,42,0.04)] lg:block">
      <Link href="/" className="mb-8 flex items-center gap-3 px-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-950 text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-lg font-semibold tracking-tight">RecruitIQ</span>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Hiring OS
          </span>
        </span>
      </Link>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-5 left-4 right-4 space-y-3"><div className="rounded-lg bg-slate-950 p-4 text-white ring-1 ring-white/10"><p className="text-sm font-semibold">Recruiter Copilot</p><p className="mt-1 text-xs leading-5 text-slate-300">Resume intelligence, candidate ranking, interview kits, and prioritized actions.</p></div>{user}</div>
    </aside>
  );
}

export function MobileNav({ user }: { user: React.ReactNode }) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          RecruitIQ
        </Link>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-3">{user}</div>
    </div>
  );
}
