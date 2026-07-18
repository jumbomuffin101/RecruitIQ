import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";
import { clerkAuthAppearance } from "@/components/auth/clerk-appearance";

export default function ClerkSignInPage() {
  return (
    <AuthShell mode="sign-in">
      <SignIn
      path="/clerk/sign-in"
      routing="path"
      signUpUrl="/clerk/sign-up"
      fallbackRedirectUrl="/dashboard"
        appearance={clerkAuthAppearance}
      />
    </AuthShell>
  );
}
