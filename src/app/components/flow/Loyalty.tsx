import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Copy, Gift, Milestone, Star, Tag } from "lucide-react";
import { aed, COUPONS, fmtDate, POINT_VALUE, tierFor, TIERS, useApp, type PointsTx } from "../../store";
import { Badge, Button, Card, CountUp, Empty, HeaderGlow, IconChip, Link, Progress, Row, ScreenShell, Section, Segmented, TierMark } from "../ds";

const STUB = { percent: "bg-brand text-white", amount: "bg-zest text-ink", freeItem: "bg-reward text-ink" };

const tierLevel = (name: string) => TIERS.findIndex((t) => t.name === name);

function TxRow({ tx }: { tx: PointsTx }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <IconChip icon={tx.kind === "bonus" ? Gift : tx.pts >= 0 ? ArrowDownLeft : ArrowUpRight} tint={tx.kind === "bonus" ? "reward" : tx.pts >= 0 ? "success" : "brand"} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{tx.label}</p>
        <p className="truncate text-sm text-ink-3">{tx.sub} · {fmtDate(tx.date)}</p>
      </div>
      {tx.kind === "held" && <Badge tone="warning">On hold</Badge>}
      <span className={`t-num font-semibold ${tx.kind === "held" ? "text-ink-3" : tx.pts >= 0 ? "text-success" : "text-brand-text"}`}>
        {tx.pts >= 0 ? "+" : "−"}{Math.abs(tx.pts)} pts
      </span>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-3 py-3">
      <p className="t-label text-ink-3">{label}</p>
      <p className="t-num t-h3 mt-1 text-brand-text">{value}</p>
      {sub && <p className="text-xs text-ink-3">{sub}</p>}
    </div>
  );
}

export function WalletScreen({ onStartOrdering }: { onStartOrdering: () => void }) {
  const { points, bonusPoints, lifetimePoints, pointsTx, push } = useApp();
  const tier = tierFor(lifetimePoints);

  return (
    <ScreenShell title="Jolli Wallet">
      <div className="relative overflow-hidden rounded-b-xl bg-brand-gradient px-4 pb-6 pt-3 text-white">
        <HeaderGlow />
        <div className="relative">
          <p className="text-sm">Current balance</p>
          <p className="text-5xl font-bold leading-none tracking-tight"><CountUp value={points} /> <span className="text-xl font-semibold text-reward">pts</span></p>
          <p className="t-num mt-2 font-semibold">≈ {aed(points * POINT_VALUE)} at checkout</p>
          <p className="mt-1 text-xs">1 pt = AED 0.05. Rates updated by Jolli HQ.</p>
        </div>
      </div>

      <Section>
        <Card className="grid grid-cols-3 divide-x divide-line">
          <Stat label="Bonus" value={`${bonusPoints} pts`} />
          <Stat label="Lifetime" value={lifetimePoints.toLocaleString()} />
          <Stat label="Expiring" value="40 pts" sub={`by ${new Date(Date.now() + 14 * 86_400_000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`} />
        </Card>
      </Section>

      <Section>
        <Card>
          <Row icon={Milestone} tint="accent" label="My Tier Journey" value={tier.name} onClick={() => push("tierJourney")} />
          <Row icon={Star} tint="reward" label="Tier Benefits" onClick={() => push("tierBenefits")} />
          <Row icon={Gift} tint="brand" label="Gift Cards" sub="Load a card's balance as points" onClick={() => push("giftCards")} />
          <Row icon={Tag} tint="success" label="Coupons" onClick={() => push("coupons")} />
        </Card>
      </Section>

      <Section title="Recent activity" action={pointsTx.length > 0 && <Link onClick={() => push("pointsHistory")}>Points history</Link>}>
        <Card>
          {pointsTx.length === 0 ? (
            <Empty icon={Star} title="No activity yet" body="Place an order to start earning." action={<Button onClick={onStartOrdering}>Start Ordering</Button>} />
          ) : (
            pointsTx.slice(0, 4).map((t) => <TxRow key={t.id} tx={t} />)
          )}
        </Card>
        <div className="h-6" />
      </Section>
    </ScreenShell>
  );
}

export function PointsHistoryScreen() {
  const { pointsTx, lifetimePoints, bonusPoints } = useApp();
  const [filter, setFilter] = useState<"all" | "earned" | "redeemed">("all");
  const list = pointsTx.filter((t) => (filter === "all" ? true : filter === "earned" ? t.pts > 0 : t.pts < 0));

  return (
    <ScreenShell title="Points History">
      <Section>
        <Card className="grid grid-cols-2 divide-x divide-line">
          <Stat label="Lifetime points" value={lifetimePoints.toLocaleString()} />
          <Stat label="Bonus points" value={String(bonusPoints)} />
        </Card>
      </Section>
      <div className="px-4 pt-4">
        <Segmented label="Filter" value={filter} onChange={setFilter} options={[{ id: "all", label: "All points" }, { id: "earned", label: "Earned" }, { id: "redeemed", label: "Redeemed" }]} />
      </div>
      <div className="px-4 pb-6 pt-3">
        {list.length === 0 ? (
          <Empty title="No activity yet" body="Your points activity will appear here." />
        ) : (
          <Card>{list.map((t) => <TxRow key={t.id} tx={t} />)}</Card>
        )}
      </div>
    </ScreenShell>
  );
}

export function TierBenefitsScreen() {
  const { lifetimePoints } = useApp();
  const current = tierFor(lifetimePoints);

  return (
    <ScreenShell title="Tier Benefits">
      <p className="px-4 pt-4 text-sm text-ink-2">Earn points with every order. Unlock bigger perks as you climb.</p>
      <div className="space-y-3 p-4">
        {TIERS.map((t, i) => {
          const isCurrent = t.name === current.name;
          return (
            <Card key={t.name} className={`p-4 ${isCurrent ? "border-2 border-reward bg-reward-subtle" : ""}`}>
              <div className="flex items-center gap-3">
                <TierMark level={i} muted={lifetimePoints < t.min} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-ink-3">{t.min === 0 ? "Starting tier" : `${t.min.toLocaleString()}+ lifetime points`}</p>
                </div>
                {isCurrent && <Badge tone="reward">Current tier</Badge>}
              </div>
              <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-ink-2"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" strokeWidth={3} /> {p}</li>
                ))}
              </ul>
            </Card>
          );
        })}
        <p className="text-xs text-ink-3">Tiers refresh quarterly. Lifetime points never reset.</p>
      </div>
    </ScreenShell>
  );
}

export function TierJourneyScreen({ onStartOrdering }: { onStartOrdering: () => void }) {
  const { lifetimePoints, profile, push } = useApp();
  const current = tierFor(lifetimePoints);
  const idx = tierLevel(current.name);
  const next = TIERS[idx + 1];
  const pct = next ? ((lifetimePoints - current.min) / (next.min - current.min)) * 100 : 100;

  const milestones = [
    { name: "Joined Jolli Club", note: fmtDate(profile.memberSince), done: true },
    ...TIERS.slice(1).map((t) => ({ name: t.name, note: `${t.min.toLocaleString()}+ lifetime points`, done: lifetimePoints >= t.min })),
  ];

  return (
    <ScreenShell
      title="My Tier Journey"
      right={<Link className="px-2" onClick={() => push("tierBenefits")}>All tiers</Link>}
      footer={<Button onClick={onStartOrdering}>Start Ordering</Button>}
    >
      <Section>
        <Card className="bg-reward-subtle p-4">
          <div className="flex items-center gap-4">
            <span className="anim-pop"><TierMark level={idx} size="lg" /></span>
            <div className="min-w-0 flex-1">
              <p className="t-h1">{current.name}</p>
              <p className="t-num text-sm text-ink-2"><CountUp value={lifetimePoints} /> lifetime pts</p>
            </div>
          </div>
          <div className="mt-4"><Progress value={pct} tone="reward" /></div>
          <p className="mt-2 text-sm text-ink-2">
            {next ? `${(next.min - lifetimePoints).toLocaleString()} pts to ${next.name}` : "You've reached the top tier."}
          </p>
        </Card>
      </Section>

      <Section title="Your story">
        <Card className="p-4">
          <ol>
            {milestones.map((m, i) => (
              <li key={m.name} className="flex gap-3">
                <div className="flex flex-col items-center pt-1.5">
                  <span className={`h-3.5 w-3.5 rounded-full ${m.done ? "bg-sunrise" : "border-2 border-line-strong bg-surface"}`} />
                  {i < milestones.length - 1 && <span className={`my-1 w-0.5 flex-1 ${m.done ? "bg-reward" : "bg-line"}`} />}
                </div>
                <div className="pb-4">
                  <p className={m.done ? "font-semibold" : "text-ink-3"}>{m.name}</p>
                  <p className="text-sm text-ink-3">{m.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <div className="h-6" />
      </Section>
    </ScreenShell>
  );
}

export function CouponsScreen() {
  const { showToast } = useApp();
  const [kind, setKind] = useState<"all" | "percent" | "amount" | "freeItem">("all");
  const shown = COUPONS.filter((c) => kind === "all" || c.kind === kind);
  const badge = (c: (typeof COUPONS)[number]) =>
    c.kind === "percent" ? `${c.value}% OFF` : c.kind === "amount" ? `AED ${c.value} OFF` : "FREE ITEM";

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    showToast(`${code} copied`);
  };

  return (
    <ScreenShell title="Coupons">
      {COUPONS.length === 0 ? (
        <Empty icon={Tag} title="No offers right now" body="Check back soon for fresh deals." />
      ) : (
        <>
          <div className="px-4 pt-4">
            <Segmented label="Filter offers" value={kind} onChange={setKind} options={[{ id: "all", label: "All" }, { id: "percent", label: "% off" }, { id: "amount", label: "AED off" }, { id: "freeItem", label: "Free item" }]} />
            <p className="mt-3 text-sm text-ink-2">Enter a code at checkout to apply it.</p>
          </div>
          <div key={kind} className="stagger space-y-3 p-4">
            {shown.length === 0 && <Empty icon={Tag} title="No offers in this category" />}
            {shown.map((c) => (
              <Card key={c.code} className="flex items-stretch">
                <div className={`flex w-20 flex-shrink-0 items-center justify-center border-r-2 border-dashed border-surface p-2 text-center text-sm font-bold leading-tight ${STUB[c.kind]}`}>{badge(c)}</div>
                <div className="min-w-0 flex-1 p-3">
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-sm text-ink-3">
                    Min order {aed(c.minOrder)}{c.maxDiscount ? ` · up to ${aed(c.maxDiscount)}` : ""} · until {fmtDate(c.validTill)}
                  </p>
                  <Button variant="secondary" size="sm" fit className="mt-2 border-dashed" onClick={() => copy(c.code)} aria-label={`Copy code ${c.code}`}>
                    <span className="font-mono">{c.code}</span> <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </ScreenShell>
  );
}
