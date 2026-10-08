import { useState } from "react";
import {
  ArrowDownLeft, ArrowUpRight, Cake, ChevronRight, CupSoda, Drumstick, Gift, HandHeart, Heart, History, IceCreamCone, Medal, Moon, MoonStar,
  PartyPopper, ShoppingBag, Smile, Star, Trophy, Wallet, type LucideIcon,
} from "lucide-react";
import { aed, fmtDate, POINT_VALUE, uid, useApp, type GiftCard, type GiftCardStatus, type GiftCardTxKind } from "../../store";
import {
  Badge, Button, Card, Confirm, Empty, Field, HeaderGlow, IconChip, INPUT_CLASS, Line, Link, ScreenShell, Section, Segmented, Sheet,
  Spinner, type Tint,
} from "../ds";

const statusLabel: Record<GiftCardStatus, string> = { active: "Ready to use", loaded: "Loaded to wallet", sent: "Sent", expired: "Expired" };
const isUsable = (g: GiftCard) => g.status === "active";
const CASH_FLOOR = 5;
const MIN_AMOUNT = 10;

/* ---------- Templates ---------- */

// A template is an occasion: its card designs and the messages people usually send with it.
// The artwork is a stand-in (icon on brand colour) until real illustrations are supplied.
interface Design { id: string; icon: LucideIcon; bg: string; fg: string }
interface Template { id: string; title: string; messages: string[]; designs: Design[] }

const TEMPLATES: Template[] = [
  { id: "birthday", title: "Birthday",
    messages: ["Happy birthday! Enjoy a treat on me 🎂", "Another year, another Chickenjoy. Happy birthday!", "Wishing you the happiest of birthdays!"],
    designs: [
      { id: "bday-1", icon: Cake, bg: "bg-reward", fg: "text-brand-deep" },
      { id: "bday-2", icon: PartyPopper, bg: "bg-brand", fg: "text-reward" },
      { id: "bday-3", icon: Gift, bg: "bg-zest", fg: "text-ink" },
    ] },
  { id: "congrats", title: "Congratulations",
    messages: ["Congratulations! This one's on me 🎉", "You did it! Time to celebrate.", "So proud of you. Enjoy!"],
    designs: [
      { id: "congrats-1", icon: Trophy, bg: "bg-brand-deep", fg: "text-reward" },
      { id: "congrats-2", icon: Medal, bg: "bg-reward", fg: "text-brand-deep" },
      { id: "congrats-3", icon: Star, bg: "bg-brand", fg: "text-white" },
    ] },
  { id: "thanks", title: "Thank you",
    messages: ["Thank you for everything — enjoy!", "A small thank-you for a big help.", "You're the best. Lunch is on me."],
    designs: [
      { id: "thanks-1", icon: Heart, bg: "bg-brand", fg: "text-white" },
      { id: "thanks-2", icon: Smile, bg: "bg-reward", fg: "text-brand-deep" },
      { id: "thanks-3", icon: HandHeart, bg: "bg-zest", fg: "text-ink" },
    ] },
  { id: "festive", title: "Eid & Ramadan",
    messages: ["Eid Mubarak! Wishing you joy and blessings ✨", "Ramadan Kareem — wishing you peace and joy 🌙"],
    designs: [
      { id: "eid-1", icon: MoonStar, bg: "bg-brand-deep", fg: "text-reward" },
      { id: "eid-2", icon: Moon, bg: "bg-success", fg: "text-white" },
      { id: "eid-3", icon: Star, bg: "bg-reward", fg: "text-brand-deep" },
    ] },
  { id: "treat", title: "Just because",
    messages: ["A little treat for you — enjoy! 😊", "Thinking of you. Go get something tasty."],
    designs: [
      { id: "treat-1", icon: Drumstick, bg: "bg-brand", fg: "text-reward" },
      { id: "treat-2", icon: IceCreamCone, bg: "bg-reward", fg: "text-brand-deep" },
      { id: "treat-3", icon: CupSoda, bg: "bg-zest", fg: "text-ink" },
    ] },
];
const templateOf = (designId?: string) => TEMPLATES.find((t) => t.designs.some((d) => d.id === designId)) ?? TEMPLATES[0];
const designById = (id?: string) => TEMPLATES.flatMap((t) => t.designs).find((d) => d.id === id);

function DesignArt({ design, className = "" }: { design: Design; className?: string }) {
  return (
    <span className={`relative flex items-center justify-center overflow-hidden rounded-lg shadow-card ${design.bg} ${design.fg} ${className}`}>
      <design.icon className="h-1/2 w-1/2" strokeWidth={1.5} />
      <span className="t-label absolute left-2 top-2">Jollibee</span>
    </span>
  );
}

/** The card as its owner sees it: design, value, who it is from or for, and the note. */
function CardFace({ design, amount, line, message }: { design: Design; amount: number; line?: string; message?: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-brand-gradient p-5 text-white shadow-float">
      <HeaderGlow />
      <span className="absolute right-4 top-4"><DesignArt design={design} className="h-14 w-20" /></span>
      <p className="t-label relative text-reward">Jolli gift card</p>
      <p className="t-display relative mt-3">{aed(amount)}</p>
      {line && <p className="relative mt-4 text-sm font-semibold">{line}</p>}
      {message && <p className="relative mt-1 text-sm">{message}</p>}
    </div>
  );
}

/* ---------- Hub: your cards, then templates to send ---------- */

export function GiftCardsScreen() {
  const { giftCards, push } = useApp();
  const usable = giftCards.filter(isUsable);
  const total = usable.reduce((s, g) => s + g.balance, 0);

  return (
    <ScreenShell
      title="Gift Cards"
      right={
        <button onClick={() => push("myGiftCards")} aria-label="My gift cards and history" className="flex h-10 w-10 items-center justify-center rounded-full">
          <History className="h-5 w-5" />
        </button>
      }
    >
      <div className="stagger pb-6">
        {/* Cards you can use come first: the commonest reason to open this screen */}
        <div className="px-4 pt-4">
          <Card>
            <button onClick={() => push("myGiftCards")} className="flex w-full items-center gap-3 p-4 text-left hover:bg-sunken">
              <IconChip icon={Gift} tint={usable.length ? "brand" : "neutral"} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {usable.length === 0 ? "No gift cards to use" : `${usable.length} gift ${usable.length === 1 ? "card" : "cards"} · ${aed(total)}`}
                </span>
                <span className="block text-sm text-ink-3">
                  {usable.length === 0 ? "Cards people send you appear here automatically" : "Load them into your Money Wallet to spend"}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-ink-3" />
            </button>
          </Card>
        </div>

        <div className="px-4 pt-6">
          <h2 className="t-h2">Send a gift card</h2>
          <p className="text-sm text-ink-2">Pick a template. It goes straight to their Jollibee account.</p>
        </div>
        {TEMPLATES.map((t) => (
          <section key={t.id} className="border-b border-dashed border-line-strong/40 pb-5 pt-4 last:border-b-0">
            <h3 className="t-h3 px-4 text-brand-text">{t.title}</h3>
            <div className="mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
              {t.designs.map((d) => (
                <button key={d.id} onClick={() => push("createGiftCard", { design: d.id })} aria-label={`${t.title} template`} className="flex-shrink-0">
                  <DesignArt design={d} className="h-24 w-36" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </ScreenShell>
  );
}

/* ---------- My cards and transaction history ---------- */

const TX_STYLE: Record<GiftCardTxKind, { icon: LucideIcon; tint: Tint; sign: string; tone: string }> = {
  purchased: { icon: ShoppingBag, tint: "neutral", sign: "", tone: "text-ink" },
  received: { icon: ArrowDownLeft, tint: "success", sign: "+", tone: "text-success" },
  sent: { icon: ArrowUpRight, tint: "brand", sign: "−", tone: "text-brand-text" },
  loaded: { icon: Wallet, tint: "accent", sign: "", tone: "text-ink" },
};

function TxRow({ kind, label, sub, amount }: { kind: GiftCardTxKind; label: string; sub: string; amount: number }) {
  const st = TX_STYLE[kind];
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <IconChip icon={st.icon} tint={st.tint} />
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug">{label}</p>
        <p className="truncate text-sm text-ink-3">{sub}</p>
      </div>
      <span className={`t-num whitespace-nowrap font-semibold ${st.tone}`}>{st.sign}{aed(amount)}</span>
    </div>
  );
}

function CardRow({ card, onOpen }: { card: GiftCard; onOpen: () => void }) {
  const design = designById(card.design) ?? TEMPLATES[0].designs[0];
  const who = card.from ? `From ${card.from}` : card.recipient ? `To ${card.recipient}` : "Bought by you";
  return (
    <button onClick={onOpen} className="flex min-h-12 w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-sunken">
      <DesignArt design={design} className="h-11 w-16 flex-shrink-0 !shadow-none" />
      <span className="min-w-0 flex-1">
        <span className="t-num block font-semibold">{aed(card.amount)}</span>
        <span className="block truncate text-sm text-ink-3">{who}</span>
      </span>
      <Badge tone={isUsable(card) ? "success" : "neutral"}>{statusLabel[card.status]}</Badge>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-3" />
    </button>
  );
}

export function MyGiftCardsScreen() {
  const { giftCards, push } = useApp();
  const [tab, setTab] = useState<"cards" | "history">("cards");
  const usable = giftCards.filter(isUsable);
  const past = giftCards.filter((g) => !isUsable(g));
  const open = (g: GiftCard) => push("giftCardDetail", { id: g.id });

  // One timeline across every card: bought, sent, received, loaded.
  const history = giftCards
    .flatMap((g) => g.tx.map((t) => ({ ...t, ref: g.ref, cardId: g.id })))
    .sort((a, b) => b.date - a.date);

  return (
    <ScreenShell title="My gift cards" footer={<Button onClick={() => push("giftCards")}>Send a gift card</Button>}>
      <div className="px-4 pt-4">
        <Segmented wide label="View" value={tab} onChange={setTab} options={[{ id: "cards", label: "Cards" }, { id: "history", label: "Transaction history" }]} />
      </div>

      {tab === "cards" ? (
        <div key="cards" className="anim-fade pb-6">
          {giftCards.length === 0 && <Empty icon={Gift} title="No gift cards yet" body="Cards people send you appear here automatically. Nothing to enter." />}
          {usable.length > 0 && (
            <Section title="Ready to use">
              <Card>{usable.map((g) => <CardRow key={g.id} card={g} onOpen={() => open(g)} />)}</Card>
            </Section>
          )}
          {past.length > 0 && (
            <Section title="Sent and used">
              <Card>{past.map((g) => <CardRow key={g.id} card={g} onOpen={() => open(g)} />)}</Card>
            </Section>
          )}
        </div>
      ) : (
        <div key="history" className="anim-fade px-4 pb-6 pt-4">
          {history.length === 0 ? (
            <Empty icon={History} title="No transactions yet" body="Gift cards you buy, send, receive or load will be listed here." />
          ) : (
            <Card>
              {history.map((t, i) => (
                <button key={i} onClick={() => push("giftCardDetail", { id: t.cardId })} className="block w-full text-left hover:bg-sunken">
                  <TxRow kind={t.kind} label={t.label} sub={`${fmtDate(t.date)} · ${t.ref}`} amount={t.amount} />
                </button>
              ))}
            </Card>
          )}
        </div>
      )}
    </ScreenShell>
  );
}

/* ---------- Create ---------- */

type For = "self" | "someone";
type ContactBy = "mobile" | "email";

export function CreateGiftCardScreen({ params }: { params?: { design?: string } }) {
  const { points, adjustPoints, setGiftCards, replace, showToast, profile } = useApp();
  const [designId, setDesignId] = useState(designById(params?.design)?.id ?? TEMPLATES[0].designs[0].id);
  const template = templateOf(designId);
  const design = designById(designId)!;

  const [amount, setAmount] = useState(50);
  const [custom, setCustom] = useState("");
  const [payWith, setPayWith] = useState<"cash" | "points">("cash");
  const [ptsUse, setPtsUse] = useState(0);
  const [who, setWho] = useState<For>("someone");
  const [contactBy, setContactBy] = useState<ContactBy>("mobile");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(template.messages[0]);
  const [errors, setErrors] = useState<{ amount?: string; contact?: string }>({});
  const [phase, setPhase] = useState<"form" | "processing" | "confirming">("form");

  const value = custom ? Number(custom) || 0 : amount;
  // Part of every card has to be paid on card, so points can cover everything except the floor.
  const maxPts = Math.max(0, Math.min(points, Math.floor((value - CASH_FLOOR) / POINT_VALUE)));
  const ptsApplied = payWith === "points" ? Math.min(ptsUse, maxPts) : 0;
  const onCard = value - ptsApplied * POINT_VALUE;
  const sending = who === "someone";

  const pickDesign = (id: string) => {
    // Changing occasion swaps the suggested note, unless the customer has written their own.
    const next = templateOf(id);
    if (next.id !== template.id && template.messages.includes(message)) setMessage(next.messages[0]);
    setDesignId(id);
  };

  const buy = () => {
    const e: typeof errors = {};
    if (value < MIN_AMOUNT) e.amount = `Minimum ${aed(MIN_AMOUNT)}`;
    if (sending && contactBy === "mobile" && !/^5\d{8}$/.test(mobile)) e.contact = "Enter a valid UAE mobile number";
    if (sending && contactBy === "email" && !/^\S+@\S+\.\S+$/.test(email)) e.contact = "Enter a valid email address.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setPhase("processing");
    setTimeout(() => setPhase("confirming"), 1100);
    setTimeout(() => {
      const id = uid("gc");
      const contact = contactBy === "mobile" ? `+971 ${mobile}` : email;
      const recipient = name.trim() || contact;
      const now = Date.now();
      const card: GiftCard = {
        id, ref: `GC-${Math.floor(1000 + Math.random() * 9000)}`, amount: value, balance: value,
        status: sending ? "sent" : "active", expires: now + 365 * 86_400_000, design: design.id,
        recipient: sending ? recipient : undefined, recipientContact: sending ? contact : undefined, message: sending ? message : undefined,
        tx: [
          ...(sending ? [{ kind: "sent" as const, label: `Sent to ${recipient}`, amount: value, date: now }] : []),
          { kind: "purchased" as const, label: "Purchased", amount: value, date: now },
        ],
      };
      if (ptsApplied > 0) adjustPoints(-ptsApplied, "Gift card", "Points used");
      setGiftCards((c) => [card, ...c]);
      showToast(sending ? "Gift card sent!" : "Gift card purchased.");
      replace("giftCardDetail", { id });
    }, 2300);
  };

  if (phase !== "form") {
    return (
      <ScreenShell title="Send a gift card" onBack={() => {}}>
        <Spinner label={phase === "processing" ? "Processing your purchase…" : "Confirming your purchase"} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Send a gift card" footer={<Button onClick={buy}>{sending ? "Send gift card" : "Buy gift card"} · {aed(onCard)}</Button>}>
      {/* Live preview: what the other person will see */}
      <div className="px-4 pt-4">
        <CardFace
          design={design} amount={value}
          line={sending ? `To ${name.trim() || "your recipient"}` : `For ${profile.firstName}`}
          message={sending ? message : undefined}
        />
      </div>

      <Section title={`Template · ${template.title}`}>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Card design">
          {TEMPLATES.flatMap((t) => t.designs.map((d) => ({ d, t }))).map(({ d, t }) => (
            <button
              key={d.id} role="radio" aria-checked={designId === d.id} aria-label={`${t.title} design`} onClick={() => pickDesign(d.id)}
              className={`flex-shrink-0 rounded-lg p-0.5 ${designId === d.id ? "ring-2 ring-brand" : ""}`}
            >
              <DesignArt design={d} className="h-12 w-[4.5rem] !shadow-none" />
            </button>
          ))}
        </div>
      </Section>

      <Section title="Amount (AED)">
        <Card className="p-4">
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 100, 200].map((a) => (
              <button
                key={a} onClick={() => { setAmount(a); setCustom(""); setErrors({}); }} aria-pressed={!custom && amount === a}
                className={`t-num h-12 rounded-md border-2 font-bold ${!custom && amount === a ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"}`}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <Field placeholder="Custom amount" aria-label="Custom amount" inputMode="numeric" value={custom} error={errors.amount} onChange={(e) => { setCustom(e.target.value.replace(/\D/g, "")); setErrors({}); }} />
          </div>
        </Card>
      </Section>

      <Section title="Who's it for?">
        <Segmented wide label="Who's it for?" value={who} onChange={setWho} options={[{ id: "someone", label: "Someone else" }, { id: "self", label: "Me" }]} />

        {sending ? (
          <Card className="mt-3 space-y-3 p-4">
            <Field label="Their name" placeholder="e.g. Ana" value={name} onChange={(e) => setName(e.target.value)} />
            <div>
              <span className="mb-1 block text-sm font-medium text-ink-2">Their Jollibee account</span>
              <Segmented label="Find them by" value={contactBy} onChange={(v) => { setContactBy(v); setErrors({}); }} options={[{ id: "mobile", label: "Mobile number" }, { id: "email", label: "Email" }]} />
              <div className="mt-2">
                {contactBy === "mobile" ? (
                  <Field aria-label="Recipient mobile number" inputMode="tel" placeholder="50 123 4567" hint="UAE numbers only (+971)" value={mobile} error={errors.contact} onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "").slice(0, 9)); setErrors({}); }} />
                ) : (
                  <Field aria-label="Recipient email" type="email" placeholder="their.email@example.com" value={email} error={errors.contact} onChange={(e) => { setEmail(e.target.value); setErrors({}); }} />
                )}
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-2">Message</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} maxLength={120} placeholder="Write a note — it appears on the card" className={`${INPUT_CLASS} h-auto border-line-strong py-2`} />
            </label>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
              {template.messages.map((m) => (
                <button key={m} onClick={() => setMessage(m)} aria-pressed={message === m} className={`h-8 max-w-56 flex-shrink-0 truncate rounded-sm px-2 text-sm ${message === m ? "bg-brand-subtle font-semibold text-brand-text" : "bg-sunken text-ink-2"}`}>{m}</button>
              ))}
            </div>
            <p className="text-xs text-ink-3">The card is added to their account straight away. There is no code or PIN to share.</p>
          </Card>
        ) : (
          <p className="mt-3 text-sm text-ink-2">The card is added to your account straight away, ready to load into your Money Wallet.</p>
        )}
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
        <div className="h-6" />
      </Section>
    </ScreenShell>
  );
}

/* ---------- Detail ---------- */

export function GiftCardDetailScreen({ params }: { params: { id: string } }) {
  const { giftCards, setGiftCards, adjustWallet, showToast } = useApp();
  const [loadOpen, setLoadOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [mobile, setMobile] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  const card = giftCards.find((g) => g.id === params.id);
  if (!card) return <ScreenShell title="Gift Card"><Empty icon={Gift} title="Could not load gift card details." /></ScreenShell>;

  const design = designById(card.design) ?? TEMPLATES[0].designs[0];
  const usable = isUsable(card);
  // A card can be passed on once, and only if it came to you unused and was not itself a gift.
  const canSend = usable && !card.from;
  const who = card.from ? `From ${card.from}` : card.recipient ? `To ${card.recipient}` : "Bought by you";

  const update = (patch: Partial<GiftCard>, tx: GiftCard["tx"][number]) =>
    setGiftCards((cards) => cards.map((c) => (c.id === card.id ? { ...c, ...patch, tx: [tx, ...c.tx] } : c)));

  const send = () => {
    if (!/^5\d{8}$/.test(mobile)) return setSendError("Enter a valid UAE mobile number");
    const to = recipient.trim() || `+971 ${mobile}`;
    update({ status: "sent", recipient: to, recipientContact: `+971 ${mobile}` }, { kind: "sent", label: `Sent to ${to}`, amount: card.balance, date: Date.now() });
    setSendOpen(false);
    showToast("Gift card sent!");
  };

  return (
    <ScreenShell title="Gift Card">
      <div className="anim-pop p-4 pb-0">
        <CardFace design={design} amount={usable ? card.balance : card.amount} line={who} message={card.message} />
      </div>

      {usable && (
        <Section>
          <div className="space-y-2">
            <Button onClick={() => setLoadOpen(true)}>Load to Money Wallet</Button>
            {canSend && <Button variant="secondary" onClick={() => setSendOpen(true)}>Send to someone</Button>}
          </div>
          <p className="mt-2 text-xs text-ink-3">Loading moves the full {aed(card.balance)} into your Money Wallet, which you can spend at checkout.</p>
        </Section>
      )}

      <Section title="Details">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3 py-1">
            <span className="text-sm text-ink-2">Status</span>
            <Badge tone={usable ? "success" : "neutral"}>{statusLabel[card.status]}</Badge>
          </div>
          <Line label="Value" value={aed(card.amount)} />
          <Line label="Template" value={templateOf(card.design).title} />
          {card.recipientContact && <Line label="Sent to account" value={card.recipientContact} />}
          <Line label="Expires" value={fmtDate(card.expires)} />
          <Line label="Reference" value={card.ref} />
        </Card>
      </Section>

      <Section title="Transaction history">
        <Card>
          {card.tx.map((t, i) => <TxRow key={i} kind={t.kind} label={t.label} sub={fmtDate(t.date)} amount={t.amount} />)}
        </Card>
        <div className="h-6" />
      </Section>

      <Confirm
        open={loadOpen} title="Load to Money Wallet?"
        message={`${aed(card.balance)} from this gift card will be added to your Money Wallet. This can't be undone.`}
        confirmLabel="Load to Wallet" cancelLabel="Not now"
        onCancel={() => setLoadOpen(false)}
        onConfirm={() => {
          adjustWallet(card.balance, "Gift card loaded");
          update({ balance: 0, status: "loaded" }, { kind: "loaded", label: "Loaded to Money Wallet", amount: card.balance, date: Date.now() });
          setLoadOpen(false);
          showToast(`${aed(card.balance)} added to your Money Wallet`);
        }}
      />

      <Sheet open={sendOpen} onClose={() => setSendOpen(false)} title="Send to someone">
        <div className="space-y-3">
          <Field label="Their name" placeholder="e.g. Ana" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          <Field label="Their mobile number" inputMode="tel" placeholder="50 123 4567" hint="The number on their Jollibee account (+971)" value={mobile} error={sendError} onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "").slice(0, 9)); setSendError(null); }} />
          <p className="rounded-md bg-reward-subtle px-3 py-2 text-sm">{aed(card.balance)} goes straight to their account. There is no code or PIN to share.</p>
          <Button disabled={mobile.length < 9} onClick={send}>Send gift card</Button>
        </div>
      </Sheet>
    </ScreenShell>
  );
}
