import { PublicPage } from "@/components/public-page";
import { PricingCards } from "@/modules/billing/ui/pricing-cards";
import { getPlatformSettings } from "@/modules/admin/application/platform-settings";

export default async function PricingPage() {
  const { platformName } = await getPlatformSettings();
  return (
    <PublicPage platformName={platformName} title="Read faster. Understand more." eyebrow="Simple pricing">
      <p>Choose the cadence that fits your reading habit. Checkout is securely completed with Mercado Pago.</p>
      <PricingCards />
    </PublicPage>
  );
}
