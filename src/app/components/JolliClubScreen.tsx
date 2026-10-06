import { Cake, History, Lock, Milestone, Star, Trophy } from "lucide-react";
import { aed, POINT_VALUE, useApp } from "../store";
import { Badge, Button, Card, CountUp, HeaderGlow, IconChip, Row, Section } from "./ds";

export interface Reward { points: number; reward: string }

const rewards: Reward[] = [
  { points: 150, reward: "Free Fries" },
  { points: 300, reward: "Free Chickenjoy" },
  { points: 600, reward: "Free Meal" },
  { points: 1000, reward: "Family Bucket" },
];

const earnRules = [
  { label: "Every 1 AED spent", value: "+1 point" },
  { label: "Refer a friend", value: "+50 points" },
  { label: "Weekly challenge", value: "+30 points" },
];

export function JolliClubScreen({ onStartOrdering, onRedeem }: { onStartOrdering: () => void; onRedeem: (r: Reward) => void }) {
  const { points, profile, push } = useApp();

  const links = [
    { icon: History, label: "Activity", sub: "Points history", to: "pointsHistory" as const, tint: "brand" as const },
    { icon: Star, label: "Benefits", sub: "All tiers", to: "tierBenefits" as const, tint: "reward" as const },
    { icon: Milestone, label: "Journey", sub: "Your story", to: "tierJourney" as const, tint: "accent" as const },
  ];

  return (
    <div className="min-h-full bg-bg pb-6">
      <div className="relative overflow-hidden rounded-b-xl bg-brand-gradient px-4 pb-6 pt-6 text-white">
        <HeaderGlow />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-reward" />
            <h1 className="t-h2">Jolli Club</h1>
          </div>
          <p className="mt-4 text-sm">Your Joy Points</p>
          <div className="flex items-end justify-between gap-3">
            <p className="text-5xl font-bold leading-none tracking-tight">
              <CountUp value={points} /> <span className="text-xl font-semibold text-reward">pts</span>
            </p>
            <Button variant="reward" size="sm" fit onClick={() => push("wallet")}>Jolli Wallet</Button>
          </div>
          <p className="t-num mt-2 text-sm">Worth {aed(points * POINT_VALUE)} at checkout</p>
        </div>
      </div>

      <div className="stagger">
        <div className="grid grid-cols-3 gap-3 px-4 pt-4">
          {links.map((l) => (
            <button key={l.to} onClick={() => push(l.to)} className="flex flex-col items-center gap-1 rounded-lg border border-line bg-surface px-1 py-3 shadow-card hover:bg-sunken">
              <IconChip icon={l.icon} tint={l.tint} />
              <span className="mt-1 text-sm font-semibold">{l.label}</span>
              <span className="text-xs text-ink-3">{l.sub}</span>
            </button>
          ))}
        </div>

        <Section title="Your Rewards">
          <Card>
            {rewards.map((r) => {
              const unlocked = points >= r.points;
              return (
                <div key={r.reward} className={`flex min-h-16 items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 ${unlocked ? "" : "bg-sunken"}`}>
                  <span className={`t-num flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${unlocked ? "bg-reward text-ink" : "border border-line-strong text-ink-3"}`}>
                    {unlocked ? r.points : <Lock className="h-5 w-5" aria-label="Locked" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{r.reward}</p>
                    <p className={`t-num text-sm ${unlocked ? "text-ink-3" : "text-brand-text"}`}>
                      {unlocked ? `${r.points} points` : `${r.points - points} points to unlock`}
                    </p>
                  </div>
                  {unlocked && <Button size="sm" fit onClick={() => onRedeem(r)}>Redeem</Button>}
                </div>
              );
            })}
          </Card>
        </Section>

        {!profile.dob && (
          <div className="px-4 pt-4">
            <Card>
              <Row icon={Cake} tint="accent" label="Birthday Surprise" sub="Add your date of birth to get a treat on your birthday" onClick={() => push("personalInfo")} />
            </Card>
          </div>
        )}

        <Section title="How to Earn Points">
          <Card>
            {earnRules.map((e) => <Row key={e.label} label={e.label} value={<Badge tone="reward">{e.value}</Badge>} />)}
          </Card>
        </Section>

        <div className="px-4 pt-6">
          <div className="relative overflow-hidden rounded-lg bg-brand-gradient p-5 text-center text-white shadow-card">
            <HeaderGlow />
            <div className="relative">
              <p className="t-h3">Keep Earning!</p>
              <p className="text-sm">Order now and collect more points</p>
              <Button variant="reward" className="mt-4" onClick={onStartOrdering}>Start Ordering</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
