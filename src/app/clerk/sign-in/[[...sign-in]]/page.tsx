import { SignIn } from "@clerk/nextjs";

export default function ClerkSignInPage() {
  return (
    <SignIn
      path="/clerk/sign-in"
      routing="path"
      signUpUrl="/clerk/sign-up"
      fallbackRedirectUrl="/dashboard"
    />
  );
}
