import { PublicPage } from "@/components/public-page";
import { legalDraftNotice } from "@/config/legal";
import { getLegalSettings, getPlatformSettings } from "@/modules/admin/application/platform-settings";

export default async function TermsPage() {
  const [{ platformName }, legalIdentity] = await Promise.all([getPlatformSettings(), getLegalSettings()]);
  return (
    <PublicPage platformName={platformName} title="Terms of Service" eyebrow={"Effective " + legalIdentity.effectiveDate}>
      <div className="legal-copy">{legalIdentity.termsText ? legalIdentity.termsText.split(/\n\s*\n/u).map((paragraph, index) => <p key={index}>{paragraph}</p>) : <>
        <p className="legal-draft-notice"><strong>Provisional:</strong> {legalDraftNotice}</p>
        <p>These terms govern access to Sysread, operated by {legalIdentity.operatorName}. By creating an account or using the service, you agree to these terms and confirm that you can legally enter this agreement.</p>

        <h2>Account and acceptable use</h2>
        <p>You are responsible for your account activity and for keeping your credentials secure. Do not misuse the service, evade limits, upload malware, interfere with other users, attempt unauthorized access, or use Sysread for unlawful activity.</p>

        <h2>Your content</h2>
        <p>You retain ownership of material you import. You grant Sysread the limited permission required to store, parse, clean, simplify and display that material for you. Import only content that you own or are authorized to use. You are responsible for respecting copyright and other third-party rights.</p>

        <h2>Magic Reading and generated output</h2>
        <p>AI-generated simplifications may contain omissions or errors. Compare important passages with the original. Generated output is provided as a reading aid and is not legal, medical, financial or other professional advice.</p>

        <h2>Subscriptions and billing</h2>
        <p>The annual plan costs US$97 and includes a seven-day trial. The weekly plan costs US$4.99 and has no trial. Mercado Pago processes checkout and recurring billing. Subscriptions renew until canceled. Available pause, resume and cancellation controls appear in the Billing tab. Cancellation stops future renewal, subject to the current paid period, provider processing and mandatory consumer rights.</p>

        <h2>Availability and termination</h2>
        <p>Features may change or be suspended for maintenance, security, provider availability or legal compliance. Accounts that materially violate these terms may be restricted or terminated. You may stop using Sysread and request account deletion at any time.</p>

        <h2>Disclaimers and liability</h2>
        <p>The service is provided on an as-available basis to the extent permitted by applicable law. Nothing in these terms excludes mandatory consumer rights or liability that cannot legally be limited.</p>

        <h2>Governing terms and contact</h2>
        <p>These terms are governed by {legalIdentity.governingLaw}. Disputes are subject to the competent courts of {legalIdentity.venue}, except where mandatory law gives you another forum.</p>
        <p>Questions about these terms may be sent to <a href={"mailto:" + legalIdentity.supportEmail}>{legalIdentity.supportEmail}</a>.</p>
      </>}</div>
    </PublicPage>
  );
}
