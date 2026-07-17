import { SignIn } from "@clerk/nextjs";

export default function ClerkSignInPage() {
  return <SignIn path="/clerk/sign-in" signUpUrl="/clerk/sign-up" />;
}
