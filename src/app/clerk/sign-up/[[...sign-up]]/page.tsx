import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";
import { clerkAuthAppearance } from "@/components/auth/clerk-appearance";

export default function ClerkSignUpPage() {
  return (
    <AuthShell mode="sign-up">
      <SignUp
      path="/clerk/sign-up"
      routing="path"
      signInUrl="/clerk/sign-in"
      forceRedirectUrl="/onboarding"
      fallbackRedirectUrl="/onboarding"
        appearance={clerkAuthAppearance}
      />
    </AuthShell>
  );
}
