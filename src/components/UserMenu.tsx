import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/auth-actions";

export function UserMenu({ name, organizationName, role }: { name: string; organizationName: string; role: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="truncate text-sm font-semibold text-slate-950">{name}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{organizationName} · {role.toLowerCase()}</p>
      <form action={signOutAction} className="mt-3"><button className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-950"><LogOut className="h-3.5 w-3.5" />Sign out</button></form>
    </div>
  );
}
