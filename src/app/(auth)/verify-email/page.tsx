import { Suspense } from "react";
import type { Metadata } from "next";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export const metadata: Metadata = {
  title: "Confirm your email",
  description: "Activate your Orqestra account.",
};

// The form reads ?email= via useSearchParams, which Next 14 requires us to
// wrap in a Suspense boundary so the page can statically prerender (with
// an empty fallback) and hydrate the query string on the client.
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
