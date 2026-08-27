import { PublicPage } from "@/components/public-page";
import { legalDraftNotice } from "@/config/legal";
import { getLegalSettings, getPlatformSettings } from "@/modules/admin/application/platform-settings";

export default async function PrivacyPage() {
  const [{ platformName }, legalIdentity] = await Promise.all([getPlatformSettings(), getLegalSettings()]);
  return (
    <PublicPage platformName={platformName} title="Privacy Policy" eyebrow={"Effective " + legalIdentity.effectiveDate}>
      <div className="legal-copy">{legalIdentity.privacyText ? legalIdentity.privacyText.split(/\n\s*\n/u).map((paragraph, index) => <p key={index}>{paragraph}</p>) : <>
        <p className="legal-draft-notice"><strong>Provisional:</strong> {legalDraftNotice}</p>
        <p>This policy explains how {legalIdentity.operatorName} processes personal data when you create a {platformName} account, import reading material, use Magic Reading or purchase a subscription.</p>

        <h2>Data we process</h2>
        <p>We process your name, email, authentication data, language, theme and reading preferences; imported files, extracted article text, chapters and reading progress; job, security and diagnostic metadata; and subscription identifiers and normalized status. {platformName} does not store complete payment-card numbers.</p>

        <h2>Why we process data</h2>
        <p>We use this data to provide and secure the service, maintain your library and progress, process imports and AI simplification, manage subscriptions, prevent abuse, diagnose failures and comply with applicable obligations.</p>

        <h2>Providers</h2>
        <p>MongoDB stores application records. Private object storage holds uploaded files. OpenAI receives only the chapter submitted to Magic Reading and API storage is disabled by the application request. Mercado Pago processes checkout, recurring payments and subscription events. Each provider processes data under its own contractual and legal obligations.</p>

        <h2>Retention and deletion</h2>
        <p>Account content is retained while your account is active. A deletion request revokes access immediately and schedules account content, progress, settings, jobs, local storage objects and subscription links for deletion or anonymization. Webhook delivery metadata expires after 90 days. Production operational logs should be retained for no more than 30 days and are designed to exclude imported text and file contents.</p>

        <h2>Your controls</h2>
        <p>You can update profile and reading settings, export your account data, manage your subscription and request account deletion from the application. Some payment or anti-fraud records may remain with Mercado Pago when required by law or its legitimate compliance obligations.</p>

        <h2>Security and international processing</h2>
        <p>{platformName} uses encrypted transport, private storage, ownership checks, password hashing, rate limits and signed webhooks. Providers may process data in other countries under their contractual safeguards. No online service can guarantee absolute security.</p>

        <h2>Contact and policy changes</h2>
        <p>The data controller is {legalIdentity.operatorName}. Privacy questions and requests may be sent to <a href={"mailto:" + legalIdentity.privacyEmail}>{legalIdentity.privacyEmail}</a>.</p>
        <p>Material changes to this policy will be dated and communicated through the service when appropriate.</p>
      </>}</div>
    </PublicPage>
  );
}
