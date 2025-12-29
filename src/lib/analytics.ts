export type AnalyticsEvent =
  | "CompanyView"
  | "PremiumClick"
  | "CheckoutStart"
  | "CheckoutSuccess"
  | "MoversView"
  | "PricingView"
  | "PricingCTA"
  | "PremiumPaywallShown"
  | "NewsletterView"
  | "NewsletterSubscribe"
  | "NewsletterConfirm"
  | "WatchlistAdd"
  | "WatchlistView"
  | "WatchlistAlertSent"
  | "PlacementClick"
  | "PartnerLeadSubmit"
  | "ReferralLinkCopy"
  | "ReferralConversion"
  | "DashboardView"
  | "AlertRuleCreate"
  | "AlertRuleDelete"
  | "ComparisonSave"
  | "ExportDownload"
  | "SettingsView"
  | "ExportDataClick"
  | "DeleteAccountClick"
  | "DeleteAccountSuccess"
  | "ClaimCTAClick"
  | "InvestorWatchlistCTA"
  | "InvestorDealflowCTA"
  | "InvestorPageView"
  | "InvestorsLandingView"
  | "FoundersLandingView"
  | "InvestorFilterUsed";

type GtagFn = (command: string, targetId: string, config?: Record<string, unknown>) => void;

export function track(event: AnalyticsEvent, props?: Record<string, string | number | boolean | null>) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: GtagFn };
  const gtag = w.gtag;
  if (!gtag) return;
  const clean: Record<string, unknown> | undefined = props ? Object.fromEntries(Object.entries(props).filter(([, v]) => v != null)) : undefined;
  gtag("event", event, clean);
}


