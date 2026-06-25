import { AppSidebar, MobileNav } from "@/components/AppSidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <MobileNav />
      <div className="flex">
        <AppSidebar />
        <div className="min-w-0 flex-1">
          <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          <footer className="border-t border-slate-200 px-6 py-5 text-center text-xs text-slate-500">
            Created by Aryan Rawat.
          </footer>
        </div>
      </div>
    </div>
  );
}
