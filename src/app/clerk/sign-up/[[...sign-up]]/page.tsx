import { SignUp } from "@clerk/nextjs";

export default function ClerkSignUpPage() {
  return <SignUp path="/clerk/sign-up" signInUrl="/clerk/sign-in" />;
}
