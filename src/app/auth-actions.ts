"use server";

import { signIn, signOut } from "@/auth";
import { assertAuthEnvironment } from "@/lib/env";

export async function signInWithGitHub() {
  assertAuthEnvironment();
  await signIn("github", { redirectTo: "/dashboard" });
}

export async function signInWithTestAccount(formData: FormData) {
  await signIn("recruitiq-test", {
    testUserKey: String(formData.get("testUserKey") ?? ""),
    redirectTo: "/dashboard",
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
