import { useEffect, useState } from "react";
import { ChevronDown, Gift, Lock, ShoppingBag, Tag, Wallet, type LucideIcon } from "lucide-react";
import {
  aed, CHECKOUT_RULES, COUPONS, EARN_PER_AED, FREE_ITEMS, POINT_VALUE, VAT_RATE, uid, useApp,
  type Coupon, type Order,
} from "../../store";
import { Badge, Button, Card, Choice, CountUp, IconChip, SuccessMark, type Tint, Confirm, Divider, Empty, Field, Line, Link, ScreenShell, Section, Sheet, Spinner } from "../ds";

/* ---------- Checkout ---------- */

const round2 = (n: number) => Math.round(n * 100) / 100;

function couponDiscount(c: Coupon, subtotal: number) {
  if (c.kind === "percent") return round2(Math.min((subtotal * c.value) / 100, c.maxDiscount ?? Infinity));
  if (c.kind === "amount") return Math.min(c.value, subtotal);
  return 0;
}

type OfferKey = "promo" | "gift" | "points";

function Blocked({ what }: { what: string }) {
  return <p className="text-sm text-ink-3">You can't combine {what} with what's already applied to this order. Remove that first.</p>;
}

function OfferRow({
  icon, tint, label, status, applied, open, onToggle, children,
}: { icon: LucideIcon; tint: Tint; label: string; status: string; applied: boolean; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-line last:border-b-0">
      <button onClick={onToggle} aria-expanded={open} className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left hover:bg-sunken">
        <IconChip icon={icon} tint={tint} />
        <span className="flex-1 font-medium">{label}</span>
        <span key={status} className={`t-num text-sm ${applied ? "anim-pop font-bold text-success" : "text-ink-3"}`}>{status}</span>
        <ChevronDown className={`h-4 w-4 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export function CheckoutScreen() {
  const { cart, cartSubtotal, selectedStore, orderMode, points, giftCards, push, pop, showToast } = useApp();
  const R = CHECKOUT_RULES;

  const [open, setOpen] = useState<OfferKey | null>(null);
  const [promo, setPromo] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [freeItem, setFreeItem] = useState<string | null>(null);
  const [freeSheet, setFreeSheet] = useState(false);

  const [gcCode, setGcCode] = useState("");
  const [gcPin, setGcPin] = useState("");
  const [gcError, setGcError] = useState<string | null>(null);
  const [gcId, setGcId] = useState<string | null>(null);
  const [gcUse, setGcUse] = useState(0);

  const [ptsUse, setPtsUse] = useState(0);

  const promoBlocked = (!R.promoWithPoints && ptsUse > 0) || (!R.promoWithGiftCard && gcId !== null);
  const gcBlocked = (!R.promoWithGiftCard && coupon !== null) || (!R.giftCardWithPoints && ptsUse > 0);
  const ptsBlocked = (!R.promoWithPoints && coupon !== null) || (!R.giftCardWithPoints && gcId !== null);
  const allCombine = R.promoWithPoints && R.promoWithGiftCard && R.giftCardWithPoints;

  const appliedCard = giftCards.find((g) => g.id === gcId) ?? null;

  // A coupon stops applying as soon as the cart falls under its minimum.
  useEffect(() => {
    if (coupon && cartSubtotal < coupon.minOrder) {
      setCoupon(null);
      setFreeItem(null);
      showToast("Coupon removed — your order no longer meets this coupon's requirements.");
    }
  }, [cartSubtotal, coupon, showToast]);

  const discount = coupon ? couponDiscount(coupon, cartSubtotal) : 0;
  const taxable = Math.max(0, cartSubtotal - discount);
  const vat = round2(taxable * VAT_RATE);
  const total = round2(taxable + vat);

  const gcApplied = Math.min(gcUse, appliedCard?.balance ?? 0, total);
  const afterCard = round2(total - gcApplied);
  // Round up so "Pay all with points" never leaves a stray fil on the card.
  const maxPts = Math.min(points, Math.ceil(round2((afterCard * R.maxPointsShare) / POINT_VALUE)));
  const ptsApplied = Math.min(ptsUse, maxPts);
  const ptsValue = Math.min(round2(ptsApplied * POINT_VALUE), afterCard);
  const due = round2(afterCard - ptsValue);

  const applyPromo = () => {
    const c = COUPONS.find((x) => x.code === promo.trim().toUpperCase());
    if (!c) return setPromoError("This code isn't valid right now. Try another?");
    if (c.validTill < Date.now()) return setPromoError("This coupon has expired.");
    if (cartSubtotal < c.minOrder) return setPromoError("Add a bit more to your cart to use this coupon.");
    setPromoError(null);
    setCoupon(c);
    if (c.kind === "freeItem") setFreeSheet(true);
    else showToast(`Coupon ${c.code} applied`);
  };

  const applyGiftCard = () => {
    const digits = gcCode.replace(/\D/g, "");
    const card = giftCards.find((g) => g.code.replace(/\D/g, "") === digits);
    if (!card) return setGcError("Could not verify gift card. Check the code and try again.");
    if (card.pin !== gcPin) return setGcError("That gift card PIN is incorrect.");
    if (card.status === "expired") return setGcError("This gift card has expired.");
    if (card.status === "loaded") return setGcError("This gift card's balance has already been moved to a wallet as Joy Points, so it can't be used here.");
    if (card.status === "sent") return setGcError("This gift card was sent to someone else.");
    if (card.balance <= 0) return setGcError("This gift card has no remaining balance.");
    setGcError(null);
    setGcId(card.id);
    setGcUse(Math.min(card.balance, total));
  };

  const placeOrder = () => {
    if (!selectedStore) return showToast("Pick a store before placing your order.");
    const lines = freeItem
      ? [...cart, { lineId: uid("free"), productId: -1, name: `${freeItem} (FREE ITEM)`, unitPrice: 0, img: "", quantity: 1, mods: [] }]
      : cart;
    const draft: Order = {
      id: `JB-${Math.floor(10500 + Math.random() * 900)}`,
      ref: `NI-${uid("").slice(-8).toUpperCase().replace(/-/g, "A")}`,
      placedAt: Date.now(), store: selectedStore, mode: orderMode, lines,
      subtotal: cartSubtotal, discount, vat, total, couponCode: coupon?.code,
      pointsRedeemed: ptsApplied, giftCardUsed: gcApplied, cardCharged: due, paidWith: "",
      pointsEarned: Math.floor(due * EARN_PER_AED), status: "placed",
    };
    push("payment", { draft, giftCardId: gcApplied > 0 ? gcId : null });
  };

  if (cart.length === 0) {
    return (
      <ScreenShell title="Checkout">
        <Empty icon={ShoppingBag} title="Your cart is empty" body="Add something from the menu to start an order." action={<Button onClick={pop}>Go back</Button>} />
      </ScreenShell>
    );
  }

  const toggle = (k: OfferKey) => setOpen((cur) => (cur === k ? null : k));

  return (
    <ScreenShell
      title="Checkout"
      footer={<Button onClick={placeOrder}>{due > 0 ? `Place order · ${aed(due)}` : "Place order"}</Button>}
    >
      <Section title="Your order" action={<Link onClick={pop}>Edit cart</Link>}>
        <Card className="px-4 py-3">
          <p className="mb-1 text-sm text-ink-3">{selectedStore} · {orderMode === "dine-in" ? "Dine In" : "Take Away"}</p>
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
            <div className="flex items-center justify-between gap-3 py-1.5">
              <span>1× {freeItem}</span>
              <Badge tone="reward">Free item</Badge>
            </div>
          )}
        </Card>
      </Section>

      {/* Each saving is its own row so what's available, and what's applied, is visible without opening anything */}
      <Section title="Offers and balances">
        <Card>
          <OfferRow
            icon={Tag} tint="reward" label="Promo code" open={open === "promo"} onToggle={() => toggle("promo")}
            status={coupon ? `${coupon.code} applied` : "Add"} applied={!!coupon}
          >
            {promoBlocked ? <Blocked what="a promo code" /> : coupon ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-ink-2">
                  {coupon.kind === "freeItem" ? freeItem ?? "Pick your free item" : `${aed(discount)} off this order`}
                </p>
                <Link onClick={() => { setCoupon(null); setFreeItem(null); setPromo(""); }} aria-label={`Remove ${coupon.code}`}>Remove</Link>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Field placeholder="Enter promo code" aria-label="Promo code" value={promo} error={promoError} onChange={(e) => { setPromo(e.target.value); setPromoError(null); }} />
                  </div>
                  <Button variant="secondary" fit onClick={applyPromo} disabled={!promo.trim()}>Apply</Button>
                </div>
                <Link className="mt-3" onClick={() => push("coupons")}>See available coupons</Link>
              </>
            )}
          </OfferRow>

          <OfferRow
            icon={Gift} tint="accent" label="Gift card" open={open === "gift"} onToggle={() => toggle("gift")}
            status={appliedCard ? `− ${aed(gcApplied)}` : "Add"} applied={!!appliedCard}
          >
            {gcBlocked ? <Blocked what="a gift card" /> : appliedCard ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-ink-2">Card ending {appliedCard.code.slice(-4)} · Balance {aed(appliedCard.balance)}</p>
                  <Link onClick={() => { setGcId(null); setGcUse(0); setGcCode(""); setGcPin(""); }} aria-label="Remove gift card">Remove</Link>
                </div>
                <input
                  type="range" min={0} max={Math.min(appliedCard.balance, total)} step={0.5} value={gcApplied}
                  onChange={(e) => setGcUse(Number(e.target.value))} aria-label="Amount to use from gift card"
                  className="mt-3 w-full accent-brand"
                />
                <p className="t-num text-sm text-ink-2">{aed(gcApplied)} will be used</p>
              </>
            ) : (
              <div className="space-y-2">
                <Field placeholder="16-digit gift card code" aria-label="Gift card code" value={gcCode} inputMode="numeric" onChange={(e) => { setGcCode(e.target.value); setGcError(null); }} />
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Field placeholder="6-digit PIN" aria-label="Gift card PIN" value={gcPin} inputMode="numeric" maxLength={6} error={gcError} onChange={(e) => { setGcPin(e.target.value.replace(/\D/g, "")); setGcError(null); }} />
                  </div>
                  <Button variant="secondary" fit onClick={applyGiftCard} disabled={!gcCode || gcPin.length < 6}>Apply</Button>
                </div>
              </div>
            )}
          </OfferRow>

          <OfferRow
            icon={Wallet} tint="brand" label="Joy Points" open={open === "points"} onToggle={() => toggle("points")}
            status={ptsApplied > 0 ? `− ${aed(ptsValue)}` : `${points.toLocaleString()} pts available`} applied={ptsApplied > 0}
          >
            {ptsBlocked ? <Blocked what="Joy Points" /> : points === 0 ? (
              <p className="text-sm text-ink-3">Earn points on your first order to redeem them next time.</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="t-num text-sm text-ink-2">{ptsApplied} pts · {aed(ptsValue)} off</p>
                  <Link onClick={() => setPtsUse(maxPts)}>Pay all with points</Link>
                </div>
                <input
                  type="range" min={0} max={maxPts} step={1} value={ptsApplied}
                  onChange={(e) => setPtsUse(Number(e.target.value))} aria-label="Points to use"
                  className="mt-3 w-full accent-brand"
                />
                <p className="text-xs text-ink-3">1 pt = AED 0.05. Rates updated by Jolli HQ.</p>
              </>
            )}
          </OfferRow>
        </Card>
        {!allCombine && <p className="mt-2 text-xs text-ink-3">Some savings can't be used together on the same order.</p>}
      </Section>

      <Section title="Summary">
        <Card className="p-4">
          <Line label="Subtotal" value={aed(cartSubtotal)} />
          {discount > 0 && <Line label={`Coupon ${coupon!.code}`} value={`− ${aed(discount)}`} tone="success" />}
          <Line label="VAT (5%)" value={aed(vat)} />
          <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2">
            <span className="font-semibold">Total</span>
            <span key={total} className="anim-pop t-num t-h2 text-brand-text">{aed(total)}</span>
          </div>
          {(gcApplied > 0 || ptsApplied > 0) && (
            <>
              <Divider />
              {gcApplied > 0 && <Line label="Gift card" value={`− ${aed(gcApplied)}`} tone="success" />}
              {ptsApplied > 0 && <Line label={`Joy Points (${ptsApplied} pts)`} value={`− ${aed(ptsValue)}`} tone="success" />}
              <Line label="Amount to pay" value={aed(due)} strong />
            </>
          )}
          <p className="mt-3 rounded-md bg-reward-subtle px-3 py-2 text-sm font-medium">You'll earn up to {Math.floor(due * EARN_PER_AED)} pts on this order.</p>
        </Card>
        <div className="h-6" />
      </Section>

      <Sheet open={freeSheet} onClose={() => { setFreeSheet(false); if (!freeItem) setCoupon(null); }} title="Pick your free item">
        <Card>
          {FREE_ITEMS.map((f) => (
            <Choice
              key={f} shape="radio" on={freeItem === f} label={f}
              onClick={() => { setFreeItem(f); setFreeSheet(false); showToast(`Coupon ${coupon?.code} applied`); }}
            />
          ))}
        </Card>
      </Sheet>
    </ScreenShell>
  );
}

/* ---------- Payment ---------- */

function useFinalizeOrder() {
  const { addOrder, adjustPoints, setGiftCards, clearCart, resetTo } = useApp();
  return (draft: Order, giftCardId: string | null, paidWith: string) => {
    const order = { ...draft, paidWith, placedAt: Date.now() };
    if (order.pointsRedeemed > 0) adjustPoints(-order.pointsRedeemed, `Order ${order.id}`, "Points used");
    if (giftCardId && order.giftCardUsed > 0) {
      setGiftCards((cards) =>
        cards.map((c) => {
          if (c.id !== giftCardId) return c;
          const balance = Math.max(0, c.balance - order.giftCardUsed);
          return {
            ...c, balance, status: balance === 0 ? "fully" : "partially",
            tx: [{ label: "Redeemed", amount: -order.giftCardUsed, date: Date.now(), balanceAfter: balance }, ...c.tx],
          };
        }),
      );
    }
    addOrder(order);
    clearCart();
    resetTo("paymentSuccess", { orderId: order.id, giftCardId });
  };
}

export function PaymentScreen({ params }: { params: { draft: Order; giftCardId: string | null } }) {
  const { savedCards, push } = useApp();
  const finalize = useFinalizeOrder();
  const { draft, giftCardId } = params;
  const [method, setMethod] = useState<string>(draft.cardCharged === 0 ? "wallet" : savedCards[0] ? `card:${savedCards[0].id}` : "card:new");
  const [busy, setBusy] = useState(false);

  const fullyCovered = draft.cardCharged === 0;

  const methods = [
    ...savedCards.map((c) => ({ id: `card:${c.id}`, label: `${c.brand} ending ${c.last4}`, sub: `Expires ${c.expires}`, soon: false })),
    { id: "card:new", label: "New card", sub: "Visa · Mastercard · via Network International", soon: false },
    { id: "gpay", label: "Google Pay", sub: "Pay with biometric", soon: false },
    { id: "apple", label: "Apple Pay", sub: "", soon: true },
    { id: "samsung", label: "Samsung Pay", sub: "", soon: true },
  ];

  const pay = () => {
    if (fullyCovered) return finalize(draft, giftCardId, "Jolli Wallet");
    const m = methods.find((x) => x.id === method)!;
    if (method === "gpay") {
      setBusy(true);
      setTimeout(() => finalize(draft, giftCardId, "Google Pay"), 1400);
      return;
    }
    push("paymentWebView", { draft, giftCardId, paidWith: m.label });
  };

  return (
    <ScreenShell
      title="Secure Payment"
      footer={<Button disabled={busy} onClick={pay}>{fullyCovered ? "Place Order" : `Pay ${aed(draft.cardCharged)}`}</Button>}
    >
      {busy ? (
        <Spinner label="Confirming your payment…" />
      ) : (
        <>
          <div className="rounded-b-xl bg-surface px-4 pb-5 pt-4 shadow-card">
            <p className="t-label text-ink-3">Amount to pay</p>
            <p className="t-display mt-1 text-brand-text">{aed(draft.cardCharged)}</p>
            <p className="mt-1 text-sm text-ink-3">Order {draft.id}</p>
            {(draft.pointsRedeemed > 0 || draft.giftCardUsed > 0) && (
              <div className="mt-3 border-t border-line pt-2">
                <Line label="Order Total" value={aed(draft.total)} />
                {draft.giftCardUsed > 0 && <Line label="Gift card" value={`− ${aed(draft.giftCardUsed)}`} tone="success" />}
                {draft.pointsRedeemed > 0 && <Line label="Jolli Wallet" value={`− ${aed(draft.pointsRedeemed * POINT_VALUE)}`} tone="success" />}
              </div>
            )}
          </div>

          <Section title="Pay with">
            {fullyCovered ? (
              <Card className="p-4">
                <p className="font-semibold">Jolli Wallet</p>
                <p className="text-sm text-ink-3">Your full usable balance is applied to this order.</p>
              </Card>
            ) : (
              <Card role="radiogroup" aria-label="Payment method">
                {methods.map((m) => (
                  <Choice
                    key={m.id} shape="radio" on={method === m.id} label={m.label} sub={m.sub || undefined}
                    disabled={m.soon} trailing={m.soon ? <Badge>Coming soon</Badge> : undefined}
                    onClick={() => setMethod(m.id)}
                  />
                ))}
              </Card>
            )}
            <p className="mt-3 flex items-start gap-2 text-xs text-ink-3">
              <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              Payments are processed securely by Network International (UAE). Your card details never touch our servers.
            </p>
            <div className="h-6" />
          </Section>
        </>
      )}
    </ScreenShell>
  );
}

export function PaymentWebViewScreen({ params }: { params: { draft: Order; giftCardId: string | null; paidWith: string } }) {
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
              <Button onClick={() => { setPhase("confirming"); setTimeout(() => finalize(params.draft, params.giftCardId, params.paidWith), 1400); }}>
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

export function PaymentSuccessScreen({ params, onHome }: { params: { orderId: string; giftCardId: string | null }; onHome: () => void }) {
  const { orders, giftCards, resetTo } = useApp();
  const order = orders.find((o) => o.id === params.orderId);
  const card = giftCards.find((g) => g.id === params.giftCardId);
  if (!order) return null;

  return (
    <div className="anim-fade absolute inset-0 z-[60] flex flex-col bg-bg">
      <div className="stagger flex-1 overflow-y-auto px-4 pt-14 text-center">
        <div><span className="inline-block"><SuccessMark /></span></div>
        <h1 className="t-h1 mt-5">Order placed!</h1>
        <p className="mt-1 text-ink-2">Your payment was successful. The kitchen has your order.</p>

        <Card className="mt-6 p-4 text-left">
          <Line label="Order reference" value={order.id} />
          <Line label="Amount paid" value={aed(order.cardCharged)} strong />
          {order.pointsRedeemed > 0 && <Line label="Points used" value={`${order.pointsRedeemed} pts`} />}
          {card && order.giftCardUsed > 0 && <Line label="Gift card balance left" value={aed(card.balance)} />}
        </Card>

        {order.pointsEarned > 0 && (
          <Card className="mt-3 border-reward bg-reward-subtle p-4 text-left">
            <p className="t-label text-zest-text">Points earned</p>
            <p className="t-h1 text-brand-text">+<CountUp value={order.pointsEarned} /> pts</p>
            <p className="text-sm text-ink-2">Lands in your wallet once the order is delivered.</p>
          </Card>
        )}
      </div>
      <div className="space-y-2 border-t border-line p-4">
        <Button onClick={() => resetTo("orderDetail", { orderId: order.id })}>Track order</Button>
        <Button variant="ghost" onClick={onHome}>Back to home</Button>
      </div>
    </div>
  );
}
