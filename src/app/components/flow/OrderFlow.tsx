import { useEffect, useState } from "react";
import { Check, ChevronDown, Fingerprint, Lock, ScanFace, ShoppingBag, Star, Tag, Wallet, type LucideIcon } from "lucide-react";
import {
  aed, CHECKOUT_RULES, COUPONS, EARN_PER_AED, FREE_ITEMS, POINT_VALUE, VAT_RATE, uid, useApp,
  type Coupon, type Order,
} from "../../store";
import { Badge, Button, Card, Choice, Confirm, CountUp, Divider, Empty, IconChip, Line, Link, ScreenShell, Section, Spinner, type Tint } from "../ds";

const round2 = (n: number) => Math.round(n * 100) / 100;

function couponDiscount(c: Coupon, subtotal: number) {
  if (c.kind === "percent") return round2(Math.min((subtotal * c.value) / 100, c.maxDiscount ?? Infinity));
  if (c.kind === "amount") return Math.min(c.value, subtotal);
  return 0;
}

const couponBadge = (c: Coupon) => (c.kind === "percent" ? `${c.value}% OFF` : c.kind === "amount" ? `AED ${c.value} OFF` : "FREE ITEM");

/** Why a coupon can't be used on this order, or null when it can. */
function couponBlocker(c: Coupon, subtotal: number) {
  if (c.validTill < Date.now()) return "This coupon has expired.";
  if (subtotal < c.minOrder) return `Add ${aed(c.minOrder - subtotal)} more to use this`;
  return null;
}

const modeLabel = (m: Order["mode"]) => (m === "dine-in" ? "Dine In" : "Take Away");

type OfferKey = "coupons" | "wallet" | "points";

/** One collapsed row of the offers card: label, what is available or applied, and its controls on tap. */
function OfferRow({
  icon, tint, label, status, applied, open, onToggle, children,
}: { icon: LucideIcon; tint: Tint; label: string; status: string; applied: boolean; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-line last:border-b-0">
      <button onClick={onToggle} aria-expanded={open} className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left hover:bg-sunken">
        <IconChip icon={icon} tint={tint} />
        <span className="flex-1 whitespace-nowrap font-medium">{label}</span>
        <span key={status} className={`t-num text-sm ${applied ? "anim-pop font-bold text-success" : "text-ink-3"}`}>{status}</span>
        <ChevronDown className={`h-4 w-4 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="anim-fade px-4 pb-4">{children}</div>}
    </div>
  );
}

/** Slider for an amount that pays towards the order: Joy Points or the Money Wallet. */
function PaySlider({
  label, max, step, value, onChange, caption, onUseAll,
}: { label: string; max: number; step: number; value: number; onChange: (v: number) => void; caption: string; onUseAll: () => void }) {
  return (
    <div>
      <input
        type="range" min={0} max={max} step={step} value={value} aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-brand"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="t-num text-sm text-ink-2">{caption}</p>
        <Link onClick={onUseAll}>Use maximum</Link>
      </div>
    </div>
  );
}

/* ---------- Checkout ---------- */

export function CheckoutScreen() {
  const { cart, cartSubtotal, selectedStore, orderMode, points, moneyWallet, savedCoupon, setSavedCoupon, push, pop, showToast } = useApp();
  const finalize = useFinalizeOrder();
  const [open, setOpen] = useState<OfferKey | null>(null);

  // Step 1 — discounts: one coupon, which lowers the order total. A coupon chosen earlier on the
  // Coupons screen arrives here already applied, as long as the order qualifies.
  const chosen = COUPONS.find((c) => c.code === savedCoupon) ?? null;
  const coupon = chosen && !couponBlocker(chosen, cartSubtotal) ? chosen : null;
  const setCoupon = (c: Coupon | null) => setSavedCoupon(c?.code ?? null);
  const [freeItem, setFreeItem] = useState<string | null>(null);
  // Step 2 — payment: points and wallet pay towards the total; a card pays whatever is left.
  const [ptsUse, setPtsUse] = useState(0);
  const [walletUse, setWalletUse] = useState(0);
  const [placing, setPlacing] = useState(false);

  // The free item belongs to its coupon: it goes when the coupon does.
  useEffect(() => {
    if (coupon?.kind !== "freeItem") setFreeItem(null);
  }, [coupon]);

  const discount = coupon ? couponDiscount(coupon, cartSubtotal) : 0;
  const taxable = Math.max(0, cartSubtotal - discount);
  const vat = round2(taxable * VAT_RATE);
  const total = round2(taxable + vat);

  // Points are capped by what is left to pay after discounts, not by the balance.
  // Rounded up so "use maximum" never leaves a stray fil for the card.
  const maxPts = Math.min(points, Math.ceil(round2((total * CHECKOUT_RULES.maxPointsShare) / POINT_VALUE)));
  const ptsApplied = Math.min(ptsUse, maxPts);
  const ptsValue = Math.min(round2(ptsApplied * POINT_VALUE), total);
  const maxWallet = round2(Math.min(moneyWallet, total - ptsValue));
  const walletApplied = Math.min(walletUse, maxWallet);
  const due = round2(total - ptsValue - walletApplied);

  const applyCoupon = (c: Coupon) => {
    setCoupon(c);
    setFreeItem(null);
    if (c.kind !== "freeItem") setOpen(null);
    showToast(c.kind === "freeItem" ? "Free item unlocked — add it to your order" : `Coupon ${c.code} applied`);
  };

  const removeCoupon = () => {
    setCoupon(null);
    setFreeItem(null);
  };

  const placeOrder = () => {
    if (!selectedStore) return showToast("Pick a store before placing your order.");
    const lines = freeItem
      ? [...cart, { lineId: uid("free"), productId: -1, name: `${freeItem} (FREE ITEM)`, unitPrice: 0, img: "", quantity: 1, mods: [] }]
      : cart;
    const draft: Order = {
      id: `JB-${Math.floor(10500 + Math.random() * 900)}`,
      // Stand-in for the token the store's POS issues with the order.
      token: Math.floor(10 + Math.random() * 90), pointsCredited: false,
      ref: `NI-${uid("").slice(-8).toUpperCase().replace(/-/g, "A")}`,
      placedAt: Date.now(), store: selectedStore, mode: orderMode, lines,
      subtotal: cartSubtotal, discount, vat, total, couponCode: coupon?.code,
      pointsRedeemed: ptsApplied, walletUsed: walletApplied, cardCharged: due, paidWith: "",
      pointsEarned: Math.floor(due * EARN_PER_AED), status: "placed",
    };
    // Nothing left for a card: the order is placed here and the payment step is skipped.
    if (due === 0) {
      setPlacing(true);
      const paidWith = [ptsApplied > 0 && "Joy Points", walletApplied > 0 && "Money Wallet"].filter(Boolean).join(" + ");
      setTimeout(() => finalize(draft, paidWith), 900);
      return;
    }
    push("payment", { draft });
  };

  if (cart.length === 0) {
    return (
      <ScreenShell title="Checkout">
        <Empty icon={ShoppingBag} title="Your cart is empty" body="Add something from the menu to start an order." action={<Button onClick={pop}>Go back</Button>} />
      </ScreenShell>
    );
  }

  if (placing) {
    return <ScreenShell title="Checkout" onBack={() => {}}><Spinner label="Placing your order…" /></ScreenShell>;
  }

  const coupons = [...COUPONS].sort((a, b) => Number(!!couponBlocker(a, cartSubtotal)) - Number(!!couponBlocker(b, cartSubtotal)));
  const usable = coupons.filter((c) => !couponBlocker(c, cartSubtotal)).length;
  const toggle = (k: OfferKey) => setOpen((cur) => (cur === k ? null : k));

  return (
    <ScreenShell
      title="Checkout"
      footer={<Button onClick={placeOrder}>{due > 0 ? `Place order · ${aed(due)}` : "Place order"}</Button>}
    >
      <Section title="Your order" action={<Link onClick={pop}>Edit cart</Link>}>
        <Card className="px-4 py-3">
          <div className="mb-1 flex items-center gap-2">
            <Badge tone="hot">{modeLabel(orderMode)}</Badge>
            <span className="truncate text-sm text-ink-3">{selectedStore}</span>
          </div>
          {cart.map((l) => (
            <div key={l.lineId} className="flex justify-between gap-3 py-1.5">
              <span className="min-w-0">
                <span className="block truncate">{l.quantity}× {l.name}</span>
                {l.mods.length > 0 && <span className="block truncate text-sm text-ink-3">{l.mods.join(", ")}</span>}
              </span>
              <span className="t-num">{aed(l.unitPrice * l.quantity)}</span>
            </div>
          ))}
          {freeItem && (
            <div className="anim-rise flex items-center justify-between gap-3 py-1.5">
              <span className="min-w-0">
                <span className="block truncate">1× {freeItem}</span>
                <Link onClick={() => setFreeItem(null)} aria-label={`Remove ${freeItem}`}>Remove</Link>
              </span>
              <Badge tone="reward">Free item</Badge>
            </div>
          )}
        </Card>
      </Section>

      {/* Three rows, closed by default. Each shows what is available or applied, and opens on tap. */}
      <Section title="Offers and balances">
        <Card>
          <OfferRow
            icon={Tag} tint="reward" label="Coupons" open={open === "coupons"} onToggle={() => toggle("coupons")}
            status={coupon ? `${coupon.code} applied` : `${usable} available`} applied={!!coupon}
          >
            <div className="-mx-4 border-t border-line">
              {coupons.map((c) => {
                const blocker = couponBlocker(c, cartSubtotal);
                const applied = coupon?.code === c.code;
                return (
                  <div key={c.code} className={`flex items-center gap-3 border-b border-line px-4 py-3 ${applied ? "bg-success-subtle" : ""} ${blocker ? "opacity-55" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <Badge tone={blocker ? "neutral" : "reward"}>{couponBadge(c)}</Badge>
                      <p className="mt-1 font-semibold">{c.title}</p>
                      <p className="t-num text-sm text-ink-2">
                        {blocker ?? (applied && c.kind !== "freeItem" ? `${aed(discount)} off this order` : `${c.code} · min order ${aed(c.minOrder)}`)}
                      </p>
                    </div>
                    {applied ? (
                      <Button variant="ghost" size="sm" fit onClick={removeCoupon} aria-label={`Remove ${c.code}`}>Remove</Button>
                    ) : (
                      <Button variant="secondary" size="sm" fit disabled={!!blocker} onClick={() => applyCoupon(c)} aria-label={`Apply ${c.code}`}>Apply</Button>
                    )}
                  </div>
                );
              })}
            </div>

            {coupon?.kind === "freeItem" && !freeItem && (
              <div className="anim-rise mt-3 overflow-hidden rounded-lg border border-reward bg-reward-subtle">
                <p className="px-4 pt-3 font-semibold">Free item unlocked — add it to your order</p>
                {FREE_ITEMS.map((f) => (
                  <div key={f} className="flex items-center gap-3 border-b border-line px-4 py-2 last:border-b-0">
                    <span className="min-w-0 flex-1 truncate">{f}</span>
                    <Button size="sm" fit onClick={() => { setFreeItem(f); showToast("Added to cart"); }} aria-label={`Add free ${f}`}>Add free</Button>
                  </div>
                ))}
              </div>
            )}
          </OfferRow>

          <OfferRow
            icon={Wallet} tint="accent" label="Money Wallet" open={open === "wallet"} onToggle={() => toggle("wallet")}
            status={walletApplied > 0 ? `− ${aed(walletApplied)}` : aed(moneyWallet)} applied={walletApplied > 0}
          >
            {moneyWallet === 0 ? (
              <p className="text-sm text-ink-3">Load a gift card to add money to your wallet. <Link onClick={() => push("myGiftCards")}>My gift cards</Link></p>
            ) : maxWallet === 0 ? (
              <p className="text-sm text-ink-3">Your Joy Points already cover this order.</p>
            ) : (
              <PaySlider
                label="Money Wallet amount to use" max={maxWallet} step={0.05} value={walletApplied} onChange={(v) => setWalletUse(round2(v))}
                caption={`${aed(walletApplied)} of ${aed(maxWallet)}`} onUseAll={() => setWalletUse(maxWallet)}
              />
            )}
          </OfferRow>

          <OfferRow
            icon={Star} tint="brand" label="Joy Points" open={open === "points"} onToggle={() => toggle("points")}
            status={ptsApplied > 0 ? `− ${aed(ptsValue)}` : `${points.toLocaleString()} pts available`} applied={ptsApplied > 0}
          >
            {points === 0 ? (
              <p className="text-sm text-ink-3">Earn points on your first order to redeem them next time.</p>
            ) : (
              <>
                <PaySlider
                  label="Joy Points to use" max={maxPts} step={1} value={ptsApplied} onChange={setPtsUse}
                  caption={`${ptsApplied} of ${maxPts} pts · ${aed(ptsValue)} off`} onUseAll={() => setPtsUse(maxPts)}
                />
                <p className="mt-1 text-xs text-ink-3">1 pt = AED 0.05. Rates updated by Jolli HQ.</p>
              </>
            )}
          </OfferRow>
        </Card>
      </Section>

      <Section title="Summary">
        <Card className="p-4">
          <Line label="Subtotal" value={aed(cartSubtotal)} />
          {discount > 0 && <Line label={`Coupon ${coupon!.code}`} value={`− ${aed(discount)}`} tone="success" />}
          {coupon?.kind === "freeItem" && <Line label={`Coupon ${coupon.code}`} value={freeItem ? `Free ${freeItem}` : "Free item not added yet"} tone="success" />}
          <Line label="VAT (5%)" value={aed(vat)} />
          <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2">
            <span className="font-semibold">Total</span>
            <span key={total} className="anim-pop t-num t-h2 text-brand-text">{aed(total)}</span>
          </div>
          {(ptsApplied > 0 || walletApplied > 0) && (
            <>
              <Divider />
              {ptsApplied > 0 && <Line label={`Joy Points (${ptsApplied} pts)`} value={`− ${aed(ptsValue)}`} tone="success" />}
              {walletApplied > 0 && <Line label="Money Wallet" value={`− ${aed(walletApplied)}`} tone="success" />}
              <Line label={due > 0 ? "Amount to pay" : "Nothing left to pay"} value={aed(due)} strong />
            </>
          )}
          <p className="mt-3 rounded-md bg-reward-subtle px-3 py-2 text-sm font-medium">You'll earn up to {Math.floor(due * EARN_PER_AED)} pts on this order.</p>
        </Card>
        <div className="h-6" />
      </Section>
    </ScreenShell>
  );
}

/* ---------- Payment ---------- */

function useFinalizeOrder() {
  const { addOrder, adjustPoints, adjustWallet, clearCart, setSavedCoupon, resetTo } = useApp();
  return (draft: Order, paidWith: string) => {
    const order = { ...draft, paidWith, placedAt: Date.now() };
    if (order.pointsRedeemed > 0) adjustPoints(-order.pointsRedeemed, `Order ${order.id}`, "Points used");
    if (order.walletUsed > 0) adjustWallet(-order.walletUsed, `Order ${order.id}`);
    addOrder(order);
    clearCart();
    setSavedCoupon(null);
    resetTo("paymentSuccess", { orderId: order.id });
  };
}

type WalletId = "apple" | "samsung" | "google";

const WALLETS: Record<WalletId, { name: string; sub: string; device: string; auth: string; icon: LucideIcon; drawnBy: string }> = {
  apple: { name: "Apple Pay", sub: "Pay with Face ID / Touch ID", device: "iPhone", auth: "Confirm with Face ID", icon: ScanFace, drawnBy: "iOS" },
  samsung: { name: "Samsung Pay", sub: "Pay with fingerprint or PIN", device: "Samsung Galaxy", auth: "Verify with fingerprint", icon: Fingerprint, drawnBy: "Samsung Wallet" },
  google: { name: "Google Pay", sub: "Pay with biometric", device: "Android", auth: "Pay with biometric", icon: Fingerprint, drawnBy: "Google Pay" },
};

// A phone only ever offers its own wallet. On a desktop browser all three show, so each flow can be reviewed.
function walletsForThisDevice(): WalletId[] {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return ["apple"];
  if (/Android/.test(ua)) return /SM-|SAMSUNG|Samsung/.test(ua) ? ["samsung", "google"] : ["google"];
  return ["apple", "samsung", "google"];
}

/**
 * Stand-in for the payment sheet the phone itself draws for Apple Pay, Samsung Pay and Google Pay.
 * It is deliberately unbranded: in the real app this sheet belongs to the operating system, not to us.
 */
function NativePaySheet({
  wallet, amount, card, onPaid, onCancel, onDeclined,
}: { wallet: WalletId; amount: number; card: string; onPaid: () => void; onCancel: () => void; onDeclined: () => void }) {
  const w = WALLETS[wallet];
  const [phase, setPhase] = useState<"review" | "authenticating" | "done">("review");

  const confirm = () => {
    setPhase("authenticating");
    setTimeout(() => setPhase("done"), 1200);
    setTimeout(onPaid, 2000);
  };

  return (
    <div className="absolute inset-0 z-[85] flex flex-col justify-end">
      <button aria-label="Cancel payment" className="anim-fade absolute inset-0 bg-ink/60 active:!transform-none" onClick={phase === "review" ? onCancel : undefined} />
      <div role="dialog" aria-label={w.name} className="anim-sheet relative rounded-t-xl bg-surface p-4 shadow-float">
        <div className="flex items-center justify-between">
          <p className="t-h3">{w.name}</p>
          {phase === "review" && <Link className="!text-ink-2" onClick={onCancel}>Cancel</Link>}
        </div>

        <div className="mt-3 divide-y divide-line border-y border-line">
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="text-sm text-ink-3">Card</span>
            <span className="t-num text-sm font-medium">{card}</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="text-sm text-ink-3">Pay Jollibee UAE</span>
            <span className="t-num t-h2">{aed(amount)}</span>
          </div>
        </div>

        <div className="flex flex-col items-center py-6" role="status">
          {phase === "review" && (
            <>
              <button onClick={confirm} aria-label={w.auth} className="relative flex h-16 w-16 items-center justify-center rounded-full bg-ink text-white">
                <span aria-hidden className="anim-ping absolute inset-0 rounded-full bg-ink" />
                <w.icon className="relative h-8 w-8" />
              </button>
              <p className="mt-3 text-sm font-medium">{w.auth}</p>
            </>
          )}
          {phase === "authenticating" && (
            <>
              <span className="h-16 w-16 animate-spin rounded-full border-4 border-line border-t-ink" />
              <p className="mt-3 text-sm font-medium">Processing…</p>
            </>
          )}
          {phase === "done" && (
            <>
              <span className="anim-pop flex h-16 w-16 items-center justify-center rounded-full bg-success text-white"><Check className="h-8 w-8" strokeWidth={3} /></span>
              <p className="mt-3 text-sm font-medium">Done</p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-ink-3">
          Simulated. On a real {w.device} this sheet is drawn by {w.drawnBy}.
          {phase === "review" && <> <Link className="!text-xs" onClick={onDeclined}>Simulate decline</Link></>}
        </p>
      </div>
    </div>
  );
}

/** Reached only when something is left to pay after points and wallet. */
export function PaymentScreen({ params }: { params: { draft: Order; sheet?: WalletId } }) {
  const { savedCards, push, showToast } = useApp();
  const finalize = useFinalizeOrder();
  const { draft } = params;
  const wallets = walletsForThisDevice();
  const [method, setMethod] = useState<string>(wallets[0] ?? (savedCards[0] ? `card:${savedCards[0].id}` : "card:new"));
  const [sheet, setSheet] = useState<WalletId | null>(params.sheet ?? null);

  const cards = [
    ...savedCards.map((c) => ({ id: `card:${c.id}`, label: `${c.brand} ending ${c.last4}`, sub: `Expires ${c.expires}` })),
    { id: "card:new", label: "New card", sub: "Visa · Mastercard · via Network International" },
  ];
  const selectedWallet = wallets.find((w) => w === method) ?? null;
  const defaultCard = savedCards.find((c) => c.isDefault) ?? savedCards[0];

  const pay = () => {
    // Wallets pay inside the app through the phone's own sheet; cards go to the gateway's hosted page.
    if (selectedWallet) return setSheet(selectedWallet);
    push("paymentWebView", { draft, paidWith: cards.find((c) => c.id === method)!.label });
  };

  return (
    <ScreenShell
      title="Secure Payment"
      footer={
        selectedWallet ? (
          <Button className="!bg-ink !text-white hover:!bg-ink-2" onClick={pay}>Pay with {WALLETS[selectedWallet].name}</Button>
        ) : (
          <Button onClick={pay}>Pay {aed(draft.cardCharged)}</Button>
        )
      }
    >
      <div className="rounded-b-xl bg-surface px-4 pb-5 pt-4 shadow-card">
        <p className="t-label text-ink-3">Amount to pay</p>
        <p className="t-display mt-1 text-brand-text">{aed(draft.cardCharged)}</p>
        <p className="mt-1 text-sm text-ink-3">Order {draft.id} · {modeLabel(draft.mode)} · {draft.store}</p>
        {(draft.pointsRedeemed > 0 || draft.walletUsed > 0) && (
          <div className="mt-3 border-t border-line pt-2">
            <Line label="Order Total" value={aed(draft.total)} />
            {draft.pointsRedeemed > 0 && <Line label={`Joy Points (${draft.pointsRedeemed} pts)`} value={`− ${aed(draft.pointsRedeemed * POINT_VALUE)}`} tone="success" />}
            {draft.walletUsed > 0 && <Line label="Money Wallet" value={`− ${aed(draft.walletUsed)}`} tone="success" />}
          </div>
        )}
      </div>

      <Section title="Pay in one tap">
        <Card role="radiogroup" aria-label="Wallets">
          {wallets.map((id) => (
            <Choice
              key={id} shape="radio" on={method === id} label={WALLETS[id].name} sub={WALLETS[id].sub}
              trailing={wallets.length > 1 ? <Badge>{WALLETS[id].device}</Badge> : undefined}
              onClick={() => setMethod(id)}
            />
          ))}
        </Card>
      </Section>

      <Section title="Or pay by card">
        <Card role="radiogroup" aria-label="Cards">
          {cards.map((c) => (
            <Choice key={c.id} shape="radio" on={method === c.id} label={c.label} sub={c.sub} onClick={() => setMethod(c.id)} />
          ))}
        </Card>
        <p className="mt-3 flex items-start gap-2 text-xs text-ink-3">
          <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          Payments are processed securely by Network International (UAE). Your card details never touch our servers.
        </p>
        <div className="h-6" />
      </Section>

      {sheet && (
        <NativePaySheet
          wallet={sheet} amount={draft.cardCharged}
          card={defaultCard ? `${defaultCard.brand} •••• ${defaultCard.last4}` : "Visa •••• 4242"}
          onPaid={() => finalize(draft, WALLETS[sheet].name)}
          onCancel={() => { setSheet(null); showToast("Payment was cancelled."); }}
          onDeclined={() => { setSheet(null); showToast("Payment was declined. Please try a different method."); }}
        />
      )}
    </ScreenShell>
  );
}

export function PaymentWebViewScreen({ params }: { params: { draft: Order; paidWith: string } }) {
  const { pop, showToast } = useApp();
  const finalize = useFinalizeOrder();
  const [phase, setPhase] = useState<"loading" | "form" | "confirming">("loading");
  const [cancel, setCancel] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPhase("form"), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <ScreenShell title="Secure Payment" onBack={() => setCancel(true)}>
      {phase === "loading" && <Spinner label="Loading secure payment page…" />}
      {phase === "confirming" && <Spinner label="Confirming your payment…" sub="Almost there…" />}
      {phase === "form" && (
        <div className="p-4">
          <Card className="p-4">
            <p className="t-label text-ink-3">Hosted payment page (simulated)</p>
            <p className="mt-2 text-sm text-ink-2">{params.paidWith}</p>
            <p className="t-h1 t-num mb-4">{aed(params.draft.cardCharged)}</p>
            <div className="space-y-2">
              <Button onClick={() => { setPhase("confirming"); setTimeout(() => finalize(params.draft, params.paidWith), 1400); }}>
                Approve payment
              </Button>
              <Button variant="secondary" onClick={() => { showToast("Payment was declined. Please try a different method."); pop(); }}>
                Simulate decline
              </Button>
            </div>
          </Card>
          <p className="mt-3 text-xs text-ink-3">Powered by Network International — your card details never reach our servers.</p>
        </div>
      )}
      <Confirm
        open={cancel} title="Cancel payment" message="Something went wrong? No charge was made."
        confirmLabel="Cancel payment" cancelLabel="Keep it"
        onCancel={() => setCancel(false)}
        onConfirm={() => { setCancel(false); showToast("Payment was cancelled."); pop(); }}
      />
    </ScreenShell>
  );
}

export const POINTS_LATER = "Points aren't added instantly. They'll be credited to your wallet after a short period.";

export function PaymentSuccessScreen({ params, onHome }: { params: { orderId: string }; onHome: () => void }) {
  const { orders, moneyWallet, resetTo } = useApp();
  const order = orders.find((o) => o.id === params.orderId);
  if (!order) return null;

  return (
    <div className="anim-fade absolute inset-0 z-[60] flex flex-col bg-bg">
      <div className="stagger flex-1 overflow-y-auto px-4 pb-4 pt-10 text-center">
        <p className="flex items-center justify-center gap-2 font-semibold text-success">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-white"><Check className="h-4 w-4" strokeWidth={3} /></span>
          Order placed!
        </p>

        {/* The token leads: it is the one thing the customer needs at the counter */}
        <div className="anim-pop mt-4 rounded-lg border-2 border-dashed border-ink bg-reward px-4 py-5 text-ink shadow-card">
          <p className="t-label">Your token number</p>
          <p className="t-num text-7xl font-bold leading-none tracking-tight" aria-label={`Token number ${order.token}`}>{order.token}</p>
          <p className="t-num mt-3 text-sm font-semibold">Order {order.id}</p>
          <p className="text-sm">{modeLabel(order.mode)} · {order.store}</p>
        </div>
        <p className="mt-3 text-sm text-ink-2">Collect your order at the counter when this number is called. Most orders are ready in 5–7 minutes.</p>

        <Card className="mt-5 p-4 text-left">
          <Line label="Order Total" value={aed(order.total)} />
          {order.pointsRedeemed > 0 && <Line label={`Joy Points (${order.pointsRedeemed} pts)`} value={`− ${aed(order.pointsRedeemed * POINT_VALUE)}`} tone="success" />}
          {order.walletUsed > 0 && <Line label="Money Wallet" value={`− ${aed(order.walletUsed)}`} tone="success" />}
          <Divider />
          <Line label={`Paid with ${order.paidWith}`} value={aed(order.cardCharged > 0 ? order.cardCharged : order.total)} strong />
          {order.walletUsed > 0 && <Line label="Money Wallet balance left" value={aed(moneyWallet)} />}
        </Card>

        {order.pointsEarned > 0 && (
          <Card className="mt-3 border-reward bg-reward-subtle p-4 text-left">
            <p className="t-label text-zest-text">Points earned</p>
            <p className="t-h1 text-brand-text">+<CountUp value={order.pointsEarned} /> pts</p>
            <p className="text-sm text-ink-2">{POINTS_LATER}</p>
          </Card>
        )}
      </div>
      <div className="space-y-2 border-t border-line bg-surface p-4">
        <Button onClick={() => resetTo("orderDetail", { orderId: order.id })}>View order</Button>
        <Button variant="ghost" onClick={onHome}>Back to home</Button>
      </div>
    </div>
  );
}
