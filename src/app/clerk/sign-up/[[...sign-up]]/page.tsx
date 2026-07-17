import { SignUp } from "@clerk/nextjs";

export default function ClerkSignUpPage() {
  return (
    <SignUp
      path="/clerk/sign-up"
      routing="path"
      signInUrl="/clerk/sign-in"
      forceRedirectUrl="/onboarding"
      fallbackRedirectUrl="/onboarding"
    />
  );
}
