import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

export function UserMenu({ name, organizationName, role }: { name: string; organizationName: string; role: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <UserButton />
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{name}</p><p className="mt-1 truncate text-xs text-slate-500">{organizationName} · {role.toLowerCase()}</p></div>
      </div>
      <div className="mt-3 overflow-hidden"><OrganizationSwitcher hidePersonal afterCreateOrganizationUrl="/dashboard" afterSelectOrganizationUrl="/dashboard" /></div>
    </div>
  );
}
