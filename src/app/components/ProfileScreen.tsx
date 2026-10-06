import { Bell, ChevronLeft, CreditCard, Gift, Globe, HelpCircle, History, LogOut, Star, Tag, User, Wallet, type LucideIcon } from "lucide-react";
import { fmtDate, tierFor, TIERS, useApp, type ScreenName } from "../store";
import { Button, Card, HeaderGlow, Row, Section, TierMark, type Tint } from "./ds";

interface ProfileScreenProps {
  onClose?: () => void;
  onLogout?: () => void;
}

export function ProfileScreen({ onClose, onLogout }: ProfileScreenProps) {
  const { profile, points, lifetimePoints, orders, savedCards, giftCards, notifPrefs, language, push } = useApp();
  const tier = tierFor(lifetimePoints);

  const sections: { title: string; tint: Tint; items: { icon: LucideIcon; label: string; value?: string; to: ScreenName }[] }[] = [
    {
      title: "Account", tint: "brand",
      items: [
        { icon: User, label: "Personal Info", value: profile.firstName, to: "personalInfo" },
        { icon: Bell, label: "Notifications", value: notifPrefs.push ? "On" : "Off", to: "notificationSettings" },
        { icon: Globe, label: "Language", value: language, to: "language" },
      ],
    },
    {
      title: "Jolli Club", tint: "reward",
      items: [
        { icon: Wallet, label: "Jolli Wallet", value: `${points.toLocaleString()} pts`, to: "wallet" },
        { icon: Star, label: "Tier Benefits", to: "tierBenefits" },
        { icon: Gift, label: "Gift Cards", value: String(giftCards.length), to: "giftCards" },
        { icon: Tag, label: "Coupons", to: "coupons" },
      ],
    },
    {
      title: "Orders & Payments", tint: "accent",
      items: [
        { icon: History, label: "Order History", value: `${orders.length} orders`, to: "orderHistory" },
        { icon: CreditCard, label: "Payment Methods", value: `${savedCards.length} cards`, to: "paymentMethods" },
      ],
    },
    {
      title: "Support", tint: "success",
      items: [{ icon: HelpCircle, label: "Help & Support", to: "helpSupport" }],
    },
  ];

  return (
    <div className="min-h-full bg-bg pb-6">
      <div className="relative overflow-hidden rounded-b-xl bg-brand-gradient px-4 pb-14 pt-6 text-white">
        <HeaderGlow />
        <div className="relative">
          <div className="flex items-center gap-1">
            {onClose && (
              <button onClick={onClose} aria-label="Close profile" className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/15">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="t-h3">Profile</h1>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <span aria-hidden className="anim-pop flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-4 border-white bg-reward text-2xl font-bold text-brand-deep">
              {profile.firstName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="t-h2 truncate">{profile.firstName} {profile.lastName}</p>
              <p className="truncate text-sm">{profile.email}</p>
              <p className="text-xs">Member since {fmtDate(profile.memberSince)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="stagger">
        <div className="-mt-9 px-4">
          <Card className="relative border-reward">
            <button onClick={() => push("tierJourney")} className="flex w-full items-center gap-3 bg-reward-subtle p-4 text-left">
              <TierMark level={TIERS.findIndex((t) => t.name === tier.name)} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink-2">Jolli Club Status</span>
                <span className="t-h3 block">{tier.name} Member</span>
                <span className="t-num block text-sm text-ink-2">{points.toLocaleString()} points</span>
              </span>
            </button>
          </Card>
        </div>

        {sections.map((section) => (
          <Section key={section.title} title={section.title}>
            <Card>
              {section.items.map((item) => (
                <Row key={item.label} icon={item.icon} tint={section.tint} label={item.label} value={item.value} onClick={() => push(item.to)} />
              ))}
            </Card>
          </Section>
        ))}

        <div className="space-y-2 px-4 pt-6">
          <Button variant="secondary" onClick={onLogout}><LogOut className="h-5 w-5" /> Log Out</Button>
          <Button variant="ghost" className="!text-error" onClick={() => push("accountDeletion")}>Delete Account</Button>
          <p className="pt-2 text-center text-xs text-ink-3">App version 1.0.7</p>
        </div>
      </div>
    </div>
  );
}
