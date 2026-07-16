import { AppSidebar, MobileNav } from "@/components/AppSidebar";
import { UserMenu } from "@/components/UserMenu";
import { getCurrentUserContext } from "@/lib/auth-context";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let context;
  try {
    context = await getCurrentUserContext();
  } catch (error) {
    if (error instanceof Error && error.message.includes("organization setup")) redirect("/onboarding");
    redirect("/sign-in");
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <MobileNav user={<UserMenu name={context.name} organizationName={context.organizationName} role={context.role} />} />
      <div className="flex">
        <AppSidebar user={<UserMenu name={context.name} organizationName={context.organizationName} role={context.role} />} />
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
