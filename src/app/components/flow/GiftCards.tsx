import { useState } from "react";
import { Cake, ChevronRight, Copy, CupSoda, Drumstick, Eye, EyeOff, Gift, HandHeart, Heart, History, IceCreamCone, Medal, Moon, MoonStar, PartyPopper, Smile, Star, Trophy, type LucideIcon } from "lucide-react";
import { aed, fmtDate, POINT_VALUE, uid, useApp, type GiftCard, type GiftCardStatus } from "../../store";
import { Badge, Button, Card, Choice, HeaderGlow, IconChip, SuccessMark, Confirm, Empty, Field, INPUT_CLASS, Link, ScreenShell, Section, Segmented, Sheet, Spinner } from "../ds";

const statusLabel: Record<GiftCardStatus, string> = {
  active: "Active", partially: "Partially redeemed", fully: "Fully redeemed", loaded: "Loaded to wallet", sent: "Sent", expired: "Expired",
};
const isUsable = (g: GiftCard) => g.status === "active" || g.status === "partially";
const CASH_FLOOR = 5;
const MIN_AMOUNT = 10;
const MESSAGES = [
  "A little treat for you — enjoy! 😊",
  "Happy birthday! Enjoy a treat on me 🎂",
  "Congratulations! This one's on me 🎉",
  "Thank you for everything — enjoy!",
  "Eid Mubarak! Wishing you joy and blessings ✨",
];

// Card designs grouped by occasion. Each occasion carries the message it pre-fills.
// The artwork is a stand-in (icon on brand colour) until real illustrations are supplied.
interface Design { id: string; icon: LucideIcon; bg: string; fg: string }
const OCCASIONS: { title: string; message: string; designs: Design[] }[] = [
  { title: "Birthday", message: MESSAGES[1], designs: [
    { id: "bday-1", icon: Cake, bg: "bg-reward", fg: "text-brand-deep" },
    { id: "bday-2", icon: PartyPopper, bg: "bg-brand", fg: "text-reward" },
    { id: "bday-3", icon: Gift, bg: "bg-zest", fg: "text-ink" },
  ] },
  { title: "Congratulations", message: MESSAGES[2], designs: [
    { id: "congrats-1", icon: Trophy, bg: "bg-brand-deep", fg: "text-reward" },
    { id: "congrats-2", icon: Medal, bg: "bg-reward", fg: "text-brand-deep" },
    { id: "congrats-3", icon: Star, bg: "bg-brand", fg: "text-white" },
  ] },
  { title: "Thank you", message: MESSAGES[3], designs: [
    { id: "thanks-1", icon: Heart, bg: "bg-brand", fg: "text-white" },
    { id: "thanks-2", icon: Smile, bg: "bg-reward", fg: "text-brand-deep" },
    { id: "thanks-3", icon: HandHeart, bg: "bg-zest", fg: "text-ink" },
  ] },
  { title: "Eid & Ramadan", message: MESSAGES[4], designs: [
    { id: "eid-1", icon: MoonStar, bg: "bg-brand-deep", fg: "text-reward" },
    { id: "eid-2", icon: Moon, bg: "bg-success", fg: "text-white" },
    { id: "eid-3", icon: Star, bg: "bg-reward", fg: "text-brand-deep" },
  ] },
  { title: "Just because", message: MESSAGES[0], designs: [
    { id: "treat-1", icon: Drumstick, bg: "bg-brand", fg: "text-reward" },
    { id: "treat-2", icon: IceCreamCone, bg: "bg-reward", fg: "text-brand-deep" },
    { id: "treat-3", icon: CupSoda, bg: "bg-zest", fg: "text-ink" },
  ] },
];
const DESIGNS = OCCASIONS.flatMap((o) => o.designs);
const designById = (id?: string) => DESIGNS.find((d) => d.id === id);

function DesignArt({ design, className = "" }: { design: Design; className?: string }) {
  return (
    <span className={`relative flex items-center justify-center overflow-hidden rounded-lg shadow-card ${design.bg} ${design.fg} ${className}`}>
      <design.icon className="h-1/2 w-1/2" strokeWidth={1.5} />
      <span className="t-label absolute left-2 top-2">Jollibee</span>
    </span>
  );
}

const statusTone = (g: GiftCard) => (isUsable(g) ? "success" : "neutral") as "success" | "neutral";

// The one place a branded object is drawn: it stands in for the card someone would hold.
function CardFace({ card }: { card: GiftCard }) {
  return (
    <div className="anim-pop relative overflow-hidden rounded-lg bg-brand-gradient p-5 text-white shadow-float">
      <HeaderGlow />
      {designById(card.design) && <DesignArt design={designById(card.design)!} className="absolute right-4 top-4 h-14 w-20" />}
      <p className="t-label relative text-reward">Jolli gift card</p>
      <p className="t-display relative mt-3">{aed(card.balance)}</p>
      <div className="relative mt-6 flex items-end justify-between text-sm">
        <span className="font-mono">•••• {card.code.slice(-4)}</span>
        <span>Expires {fmtDate(card.expires)}</span>
      </div>
    </div>
  );
}

function CardRow({ card, onOpen }: { card: GiftCard; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="flex min-h-12 w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-sunken">
      <IconChip icon={Gift} tint={isUsable(card) ? "brand" : "neutral"} size="lg" />
      <span className="min-w-0 flex-1">
        <span className="t-num t-h3 block">{aed(card.balance)}</span>
        <span className="block text-sm text-ink-3">Ending {card.code.slice(-4)} · expires {fmtDate(card.expires)}</span>
      </span>
      <Badge tone={statusTone(card)}>{statusLabel[card.status]}</Badge>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-3" />
    </button>
  );
}

/** Entry point: pick an occasion and a design, like choosing a card off a rack. */
export function GiftCardsScreen() {
  const { giftCards, push } = useApp();
  return (
    <ScreenShell
      title="Send a gift card"
      right={
        <button onClick={() => push("myGiftCards")} aria-label={`My gift cards, ${giftCards.length}`} className="flex h-10 w-10 items-center justify-center rounded-full">
          <History className="h-5 w-5" />
        </button>
      }
    >
      <div className="stagger pb-6">
        {OCCASIONS.map((o) => (
          <section key={o.title} className="border-b border-dashed border-line-strong/40 pb-5 pt-4 last:border-b-0">
            <h2 className="t-h3 px-4 text-brand-text">{o.title}</h2>
            <div className="mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
              {o.designs.map((d) => (
                <button key={d.id} onClick={() => push("createGiftCard", { design: d.id, message: o.message })} aria-label={`${o.title} design`} className="flex-shrink-0">
                  <DesignArt design={d} className="h-24 w-36" />
                </button>
              ))}
            </div>
          </section>
        ))}
        <div className="px-4 pt-2">
          <Button variant="secondary" onClick={() => push("addGiftCard")}>Add received card</Button>
        </div>
      </div>
    </ScreenShell>
  );
}

export function MyGiftCardsScreen() {
  const { giftCards, push } = useApp();
  const active = giftCards.filter(isUsable);
  const used = giftCards.filter((g) => !isUsable(g));

  return (
    <ScreenShell
      title="My gift cards"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => push("addGiftCard")} aria-label="Add received card">Add card</Button>
          <Button onClick={() => push("giftCards")}>Buy gift card</Button>
        </div>
      }
    >
      {giftCards.length === 0 && <Empty icon={Gift} title="No gift cards yet" body="Buy one for yourself, or send one to a friend or family member." />}

      {active.length > 0 && (
        <Section title="Your cards">
          <Card>{active.map((g) => <CardRow key={g.id} card={g} onOpen={() => push("giftCardDetail", { id: g.id })} />)}</Card>
        </Section>
      )}

      {used.length > 0 && (
        <Section title="Used and expired">
          <Card>{used.map((g) => <CardRow key={g.id} card={g} onOpen={() => push("giftCardDetail", { id: g.id })} />)}</Card>
        </Section>
      )}
      <div className="h-6" />
    </ScreenShell>
  );
}

type Channel = "self" | "email" | "link" | "sms";

export function CreateGiftCardScreen({ params }: { params?: { design?: string; message?: string } }) {
  const { points, adjustPoints, setGiftCards, replace, showToast, profile } = useApp();
  const design = designById(params?.design) ?? DESIGNS[0];
  const [amount, setAmount] = useState(50);
  const [custom, setCustom] = useState("");
  const [payWith, setPayWith] = useState<"cash" | "points">("cash");
  const [ptsUse, setPtsUse] = useState(0);
  const [channel, setChannel] = useState<Channel>("self");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(params?.message ?? MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "processing" | "confirming">("form");

  const value = custom ? Number(custom) || 0 : amount;
  // Part of every card has to be paid on card, so points can cover everything except the floor.
  const maxPts = Math.max(0, Math.min(points, Math.floor((value - CASH_FLOOR) / POINT_VALUE)));
  const ptsApplied = payWith === "points" ? Math.min(ptsUse, maxPts) : 0;
  const onCard = value - ptsApplied * POINT_VALUE;

  const buy = () => {
    if (value < MIN_AMOUNT) return setError(`Minimum ${aed(MIN_AMOUNT)}`);
    if (channel === "email" && !/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    setError(null);
    setPhase("processing");
    setTimeout(() => setPhase("confirming"), 1100);
    setTimeout(() => {
      const id = uid("gc");
      const digits = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join("");
      const sent = channel !== "self";
      const card: GiftCard = {
        id, code: digits.replace(/(\d{4})(?=\d)/g, "$1-"), pin: String(Math.floor(100000 + Math.random() * 900000)),
        amount: value, balance: value, status: sent ? "sent" : "active", expires: Date.now() + 365 * 86_400_000,
        recipient: sent ? name || email : undefined, message: sent ? message : undefined, design: design.id, sendsLeft: sent ? 0 : 1,
        tx: [{ label: "Purchased", amount: value, date: Date.now(), balanceAfter: value }],
      };
      if (ptsApplied > 0) adjustPoints(-ptsApplied, "Gift card", "Points used");
      setGiftCards((c) => [card, ...c]);
      showToast(sent ? "Gift card sent!" : "Gift card purchased.");
      replace("giftCardDetail", { id });
    }, 2300);
  };

  if (phase !== "form") {
    return (
      <ScreenShell title="Create a gift card" onBack={() => {}}>
        <Spinner label={phase === "processing" ? "Processing your purchase…" : "Confirming your purchase"} />
      </ScreenShell>
    );
  }

  const channels: { id: Channel; label: string; sub?: string; soon?: boolean }[] = [
    { id: "self", label: "For me", sub: `Code and PIN emailed to ${profile.email}` },
    { id: "email", label: "Email to someone" },
    { id: "link", label: "Share a link" },
    { id: "sms", label: "Text message", soon: true },
  ];

  return (
    <ScreenShell title="Create a gift card" footer={<Button onClick={buy}>{channel === "self" ? "Buy gift card" : "Send gift card"} · {aed(onCard)}</Button>}>
      <div className="flex justify-center px-4 pt-5">
        <span className="anim-pop"><DesignArt design={design} className="h-36 w-56" /></span>
      </div>

      <Section title="Amount (AED)">
        <Card className="p-4">
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 100, 200].map((a) => (
              <button key={a} onClick={() => { setAmount(a); setCustom(""); setError(null); }} className={`t-num h-12 rounded-md border-2 font-bold ${!custom && amount === a ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"}`}>
                {a}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <Field placeholder="Custom amount" inputMode="numeric" value={custom} error={error?.startsWith("Minimum") ? error : null} onChange={(e) => { setCustom(e.target.value.replace(/\D/g, "")); setError(null); }} />
          </div>
        </Card>
      </Section>

      <Section title="Pay with">
        <Card className="p-4">
          <Segmented label="Pay with" value={payWith} onChange={setPayWith} options={[{ id: "cash", label: "Card" }, { id: "points", label: "Joy Points + card" }]} />
          {payWith === "points" && (
            <div className="mt-3">
              {maxPts === 0 ? (
                <p className="text-sm text-ink-3">Not enough points available right now.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="t-num text-sm text-ink-2">{ptsApplied} pts · {aed(onCard)} on card</p>
                    <Link onClick={() => setPtsUse(maxPts)}>All points</Link>
                  </div>
                  <input type="range" min={0} max={maxPts} step={10} value={ptsApplied} onChange={(e) => setPtsUse(Number(e.target.value))} aria-label="Points to use" className="mt-3 w-full accent-brand" />
                </>
              )}
            </div>
          )}
        </Card>
      </Section>

      <Section title="Who's it for?">
        <Card role="radiogroup" aria-label="Who's it for?">
          {channels.map((c) => (
            <Choice
              key={c.id} shape="radio" on={channel === c.id} label={c.label} sub={c.sub} disabled={c.soon}
              trailing={c.soon ? <Badge>Coming soon</Badge> : undefined} onClick={() => setChannel(c.id)}
            />
          ))}
        </Card>

        {channel !== "self" && (
          <Card className="mt-3 space-y-3 p-4">
            <Field label="Recipient name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            {channel === "email" && (
              <Field label="Email address" type="email" placeholder="your.email@example.com" value={email} error={error?.includes("email") ? error : null} onChange={(e) => { setEmail(e.target.value); setError(null); }} />
            )}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-2">Personal message (optional)</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Write a note — it appears on the card" className={`${INPUT_CLASS} h-auto border-line-strong py-2`} />
            </label>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
              {MESSAGES.map((m) => (
                <button key={m} onClick={() => setMessage(m)} className="h-8 whitespace-nowrap rounded-sm bg-sunken px-2 text-sm text-ink-2">{m.split(/[!—]/)[0].trim()}</button>
              ))}
            </div>
            <p className="text-xs text-ink-3">The recipient will need the Jollibee app to redeem this card.</p>
          </Card>
        )}
        <div className="h-6" />
      </Section>
    </ScreenShell>
  );
}

export function GiftCardDetailScreen({ params }: { params: { id: string } }) {
  const { giftCards, setGiftCards, adjustPoints, showToast } = useApp();
  const [showPin, setShowPin] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [recipient, setRecipient] = useState("");

  const card = giftCards.find((g) => g.id === params.id);
  if (!card) return <ScreenShell title="Gift Card"><Empty title="Could not load gift card details." /></ScreenShell>;

  const usable = isUsable(card);
  const ptsValue = Math.floor(card.balance / POINT_VALUE);
  const copy = (text: string, msg: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    showToast(msg);
  };
  const update = (patch: Partial<GiftCard>, tx?: GiftCard["tx"][number]) =>
    setGiftCards((cards) => cards.map((c) => (c.id === card.id ? { ...c, ...patch, tx: tx ? [tx, ...c.tx] : c.tx } : c)));

  return (
    <ScreenShell title={`Gift Card · ${card.code.slice(-4)}`}>
      <div className="p-4 pb-0"><CardFace card={card} /></div>

      {card.recipient && (
        <Section title="Sent to">
          <Card className="p-4">
            <p className="font-semibold">{card.recipient}</p>
            {card.message && <p className="mt-1 text-sm text-ink-2">{card.message}</p>}
          </Card>
        </Section>
      )}

      <Section title="Details">
        <Card className="px-4 py-2">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-sm text-ink-2">Status</span>
            <Badge tone={statusTone(card)}>{statusLabel[card.status]}</Badge>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3 border-t border-line">
            <span className="text-sm text-ink-2">Denomination</span>
            <span className="t-num">{aed(card.amount)}</span>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3 border-t border-line">
            <span className="text-sm text-ink-2">Card code</span>
            <button onClick={() => copy(card.code, "Card code copied")} aria-label="Copy card code" className="flex h-11 items-center gap-2 font-mono text-sm">
              {card.code} <Copy className="h-4 w-4 text-ink-3" />
            </button>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3 border-t border-line">
            <span className="text-sm text-ink-2">PIN</span>
            <button onClick={() => setShowPin((v) => !v)} aria-label={showPin ? "Hide PIN" : "Show PIN"} className="flex h-11 items-center gap-2 font-mono text-sm">
              {showPin ? card.pin : "••••••"} {showPin ? <EyeOff className="h-4 w-4 text-ink-3" /> : <Eye className="h-4 w-4 text-ink-3" />}
            </button>
          </div>
        </Card>
      </Section>

      {usable && (
        <Section>
          <div className="space-y-2">
            <Button onClick={() => setLoadOpen(true)}>Load to Wallet</Button>
            <Button variant="secondary" disabled={card.sendsLeft === 0} onClick={() => setSendOpen(true)}>
              {card.sendsLeft === 0 ? "No sends left on this card" : "Send Gift Card"}
            </Button>
            <Button variant="ghost" onClick={() => copy(`${MESSAGES[0]}\nCode: ${card.code}\nPIN: ${card.pin}`, "Message copied")}>
              Copy code and PIN as a message
            </Button>
          </div>
        </Section>
      )}

      <Section title="Transaction history">
        <Card>
          {card.tx.length === 0 ? (
            <p className="p-4 text-sm text-ink-3">No transactions yet</p>
          ) : (
            card.tx.map((t, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <div>
                  <p>{t.label}</p>
                  <p className="t-num text-sm text-ink-3">{fmtDate(t.date)} · Balance after {aed(t.balanceAfter)}</p>
                </div>
                <span className={`t-num whitespace-nowrap font-semibold ${t.amount >= 0 ? "text-success" : "text-brand-text"}`}>{t.amount >= 0 ? "+" : "−"}{aed(Math.abs(t.amount))}</span>
              </div>
            ))
          )}
        </Card>
        <div className="h-6" />
      </Section>

      <Confirm
        open={loadOpen} title="Load to Wallet?"
        message={`Your gift card balance of ${aed(card.balance)} will be converted to ~${ptsValue} pts in your loyalty wallet. This can't be undone.`}
        confirmLabel="Load to Wallet" cancelLabel="Not now"
        onCancel={() => setLoadOpen(false)}
        onConfirm={() => {
          adjustPoints(ptsValue, "Gift card loaded", `${aed(card.balance)} loaded → ${ptsValue} pts`, "bonus");
          update({ balance: 0, status: "loaded" }, { label: "Loaded to wallet", amount: -card.balance, date: Date.now(), balanceAfter: 0 });
          setLoadOpen(false);
          showToast(`${ptsValue} pts added to your wallet!`);
        }}
      />

      <Sheet open={sendOpen} onClose={() => setSendOpen(false)} title="Send Gift Card">
        <div className="space-y-3">
          <Field label="Recipient name" placeholder="e.g. Dela Cruz" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          <p className="text-xs text-ink-3">The recipient will need the Jollibee app to redeem this card.</p>
          <Button
            disabled={!recipient.trim()}
            onClick={() => {
              update({ status: "sent", recipient: recipient.trim(), sendsLeft: 0 });
              setSendOpen(false);
              showToast("Gift card sent!");
            }}
          >
            Send gift card
          </Button>
        </div>
      </Sheet>
    </ScreenShell>
  );
}

export function AddGiftCardScreen() {
  const { giftCards, setGiftCards, replace, pop } = useApp();
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const [added, setAdded] = useState<GiftCard | null>(null);

  const formatted = code.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1-");

  const submit = () => {
    if (giftCards.some((g) => g.code === formatted)) return setError("Already in your wallet");
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      // Demo rule in place of the gift-card API: codes ending in 0000 are rejected.
      if (formatted.endsWith("0000")) return setError("Could not verify gift card. Check the code and try again.");
      const card: GiftCard = {
        id: uid("gc"), code: formatted, pin, amount: 50, balance: 50, status: "active",
        expires: Date.now() + 200 * 86_400_000, sendsLeft: 0,
        tx: [{ label: "Issued", amount: 50, date: Date.now(), balanceAfter: 50 }],
      };
      setGiftCards((c) => [card, ...c]);
      setAdded(card);
    }, 1100);
  };

  if (added) {
    return (
      <ScreenShell title="Add Gift Card" onBack={pop}>
        <div className="px-4 pt-10 text-center">
          <span className="inline-block"><SuccessMark /></span>
          <p className="t-h1 mt-4">Gift card added!</p>
          <p className="t-num mt-1 text-ink-2">Balance: {aed(added.balance)}</p>
          <div className="mt-6 space-y-2">
            <Button onClick={() => replace("giftCardDetail", { id: added.id })}>View card</Button>
            <Button variant="ghost" onClick={pop}>Back</Button>
          </div>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Add Gift Card" footer={<Button disabled={busy || formatted.length < 19 || pin.length < 6} onClick={submit}>{busy ? "Checking…" : "Add card"}</Button>}>
      <div className="space-y-4 p-4">
        <p className="text-sm text-ink-2">Enter the 16-digit code and 6-digit PIN from your received gift card</p>
        <Field label="Gift card code" placeholder="1234-5678-9012-3456" inputMode="numeric" value={formatted} error={error} onChange={(e) => { setCode(e.target.value); setError(null); }} />
        <Field label="6-digit PIN" placeholder="••••••" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        <Link onClick={() => setHelp(true)}>How do I find my code and PIN?</Link>
      </div>
      <Sheet open={help} onClose={() => setHelp(false)} title="Finding your code and PIN">
        <p className="text-sm text-ink-2">
          Your 16-digit code and 6-digit PIN are included in the gift card email, SMS or link you received. The code looks like: 1234-5678-9012-3456.
        </p>
      </Sheet>
    </ScreenShell>
  );
}
