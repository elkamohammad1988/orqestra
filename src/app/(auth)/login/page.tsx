import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Orqestra workspace.",
};

export default function LoginPage() {
  // LoginForm uses `useSearchParams()` to read the `?next=` param the
  // middleware sets when bouncing unauthenticated users. Next 14 requires
  // a Suspense boundary around any client component that reads search
  // params, otherwise static prerendering of /login fails.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
