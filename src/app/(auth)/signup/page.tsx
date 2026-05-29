import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your Orqestra workspace.",
};

export default function SignupPage() {
  // Same `useSearchParams` Suspense requirement as /login — see comment there.
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
