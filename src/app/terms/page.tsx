import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of Orqestra and the agreement between us.",
};

// Plain-language placeholder terms. The structure mirrors what most SaaS
// agreements include (acceptance, account, fees, IP, termination, etc.) so
// counsel can extend without restructuring. Replace before launching to
// paying customers — this is intentionally not legal advice.
export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" effectiveDate="May 26, 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of
        Orqestra (the &ldquo;Service&rdquo;). By accessing or using the
        Service, you agree to be bound by these Terms. If you do not agree,
        do not use the Service.
      </p>

      <Section title="1. Your account">
        <p>
          To use most features of the Service you must create an account. You
          are responsible for the accuracy of the information you provide and
          for keeping your credentials secure. You must notify us promptly of
          any unauthorized access.
        </p>
      </Section>

      <Section title="2. Acceptable use">
        <p>
          You agree not to (a) reverse engineer or attempt to extract the
          source code of the Service, (b) use the Service to build a
          competing product, (c) send abusive, illegal, or harmful content
          through the platform, or (d) use the Service to violate any third
          party&rsquo;s rights or applicable law.
        </p>
      </Section>

      <Section title="3. Subscriptions and billing">
        <p>
          Paid plans renew automatically until canceled. Fees are billed in
          advance and are non-refundable except where required by law. We may
          change pricing on prospective renewals with reasonable notice.
        </p>
      </Section>

      <Section title="4. Your content">
        <p>
          You retain all rights to the workflows, prompts, and other data you
          submit (&ldquo;Customer Content&rdquo;). You grant us a limited
          license to host, process, and transmit Customer Content solely as
          necessary to operate the Service for you.
        </p>
      </Section>

      <Section title="5. Third-party services">
        <p>
          The Service integrates with third-party AI providers (including
          Anthropic). Their availability, pricing, and terms are governed by
          their own agreements. We are not responsible for outages or changes
          to those services.
        </p>
      </Section>

      <Section title="6. Termination">
        <p>
          You may cancel your account at any time from the Settings page.
          We may suspend or terminate accounts that violate these Terms or
          that pose a risk to the Service or other users.
        </p>
      </Section>

      <Section title="7. Disclaimers">
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF
          ANY KIND. WE DO NOT GUARANTEE THAT WORKFLOWS WILL PRODUCE
          ERROR-FREE OUTPUT, OR THAT THE SERVICE WILL BE UNINTERRUPTED OR
          SECURE BEYOND COMMERCIALLY REASONABLE EFFORTS.
        </p>
      </Section>

      <Section title="8. Limitation of liability">
        <p>
          To the maximum extent permitted by law, our aggregate liability
          arising out of or relating to these Terms or the Service is limited
          to the amounts you paid us in the 12 months preceding the claim.
        </p>
      </Section>

      <Section title="9. Changes to these Terms">
        <p>
          We may update these Terms from time to time. Material changes will
          be communicated by email or through the Service. Continued use of
          the Service after the effective date constitutes acceptance.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          For questions about these Terms, contact us at{" "}
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
