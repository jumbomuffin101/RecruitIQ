"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth-context";
import { getPrisma } from "@/lib/prisma";

const organizationNameSchema = z.string().trim().min(2).max(80);

function createSlug(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createOrganization(formData: FormData) {
  const user = await requireAuthenticatedUser();
  if (user.organizationId) redirect("/dashboard");
  const parsed = organizationNameSchema.safeParse(formData.get("organizationName"));
  if (!parsed.success) throw new Error("Enter an organization name between 2 and 80 characters.");
  const organization = await getPrisma().organization.create({ data: { name: parsed.data, slug: createSlug(parsed.data) } });
  await getPrisma().user.update({ where: { id: user.id }, data: { organizationId: organization.id, role: "ADMIN" } });
  redirect("/dashboard");
}
