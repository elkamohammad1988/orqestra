"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword, type AuthResult } from "@/app/(auth)/actions";

export function ResetPasswordForm() {
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    const result: AuthResult = await updatePassword(formData);
    // Success path throws redirect() inside the action; we only see errors.
    if (result?.error) setError(result.error);
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
          Choose a new password
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Pick something at least 8 characters long. You&apos;ll be signed in
          right after.
        </p>
      </div>

      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive">
            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full rounded-lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          Updating password…
        </>
      ) : (
        "Update password"
      )}
    </Button>
  );
}
