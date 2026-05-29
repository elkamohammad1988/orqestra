import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Orqestra collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" effectiveDate="May 26, 2026">
      <p>
        This Privacy Policy explains what information we collect when you
        use Orqestra (the &ldquo;Service&rdquo;), how we use it, and the
        choices you have. We aim to collect the minimum needed to run the
        Service well.
      </p>

      <Section title="1. Information we collect">
        <p>
          <strong>Account data:</strong> name, email address, and password
          hash. Optionally a profile photo if you sign in with Google.
        </p>
        <p>
          <strong>Workflow data:</strong> the workflows, prompts, and node
          configurations you create. Stored encrypted at rest by Supabase.
        </p>
        <p>
          <strong>Run data:</strong> execution metadata (status, duration,
          token count) and event logs for runs you trigger. Used to power
          the dashboard&rsquo;s run history view and to debug failures.
        </p>
        <p>
          <strong>Usage data:</strong> aggregate counts (workflows created,
          runs executed) used to enforce plan limits and improve the
          product. We do not sell this data.
        </p>
      </Section>

      <Section title="2. How we use information">
        <p>
          To operate the Service, authenticate you, deliver streamed AI
          responses, enforce plan limits, communicate about your account,
          and improve the product. We do not use Customer Content to train
          AI models.
        </p>
      </Section>

      <Section title="3. Subprocessors">
        <p>
          We rely on a small number of trusted vendors to run the Service:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Supabase</strong> — authentication and database hosting.
          </li>
          <li>
            <strong>Anthropic</strong> — Claude model inference for AI steps.
          </li>
          <li>
            <strong>Vercel</strong> — application hosting and edge delivery.
          </li>
        </ul>
        <p>
          Each subprocessor is bound by a data processing agreement and
          industry-standard security practices.
        </p>
      </Section>

      <Section title="4. Retention">
        <p>
          We keep your data as long as your account is active. When you
          delete your account from Settings, your workflows, runs, and
          profile are removed within 30 days. Backups roll off on the
          standard Supabase retention schedule.
        </p>
      </Section>

      <Section title="5. Your rights">
        <p>
          Depending on where you live, you may have rights to access,
          correct, delete, or port your personal data, and to object to
          certain processing. You can exercise most of these directly from
          the Settings page, or email us for help.
        </p>
      </Section>

      <Section title="6. Cookies">
        <p>
          We use only essential cookies to keep you signed in. No
          advertising or third-party analytics cookies are set by default.
        </p>
      </Section>

      <SecuritySection />

      <Section title="8. Children">
        <p>
          Orqestra is not directed to children under 16. We do not knowingly
          collect personal data from children. If you believe a child has
          provided us data, contact us and we will delete it.
        </p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>
          We may update this Policy from time to time. Material changes will
          be communicated by email or through the Service.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          For privacy questions or data requests, contact{" "}
          <a
            href="mailto:hello@orqestra.ai"
            className="font-medium underline underline-offset-4"
          >
            hello@orqestra.ai
          </a>
          .
        </p>
      </Section>
    </LegalShell>
  );
}

function SecuritySection() {
  return (
    // The footer links to /privacy#security, so we anchor this section
    // explicitly. Keep the id stable.
    <section id="security" className="scroll-mt-24 space-y-2">
      <h2 className="text-[17px] font-semibold tracking-tight text-foreground">
        7. Security
      </h2>
      <div className="text-muted-foreground">
        <p>
          All connections are encrypted in transit (TLS 1.2+). Data is
          encrypted at rest. Row-Level Security is enforced at the database
          layer so each user can only access their own rows, even via the
          Supabase API.
        </p>
        <p className="mt-2">
          API keys for third-party services live only on the server. We
          maintain a vulnerability disclosure process — report issues to{" "}
          <a
            href="mailto:security@orqestra.ai"
            className="font-medium underline underline-offset-4"
          >
            security@orqestra.ai
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[17px] font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="text-muted-foreground">{children}</div>
    </section>
  );
}
