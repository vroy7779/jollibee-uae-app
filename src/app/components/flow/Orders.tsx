import { useEffect, useState } from "react";
import { Copy, MessageCircle, Phone, ReceiptText, Share2 } from "lucide-react";
import { aed, CANCEL_WINDOW_MS, fmtDate, fmtDateTime, orderState, POINT_VALUE, useApp } from "../../store";
import { storePhone } from "../StoresScreen";
import { POINTS_LATER } from "./OrderFlow";
import { Badge, Button, Card, Confirm, Empty, IconButton, Line, Link, Row, ScreenShell, Section } from "../ds";

type State = ReturnType<typeof orderState>;

const stateLabel: Record<State, string> = { open: "Placed", completed: "Completed", cancelled: "Cancelled" };
const stateTone: Record<State, "reward" | "neutral" | "brand"> = { open: "reward", completed: "neutral", cancelled: "brand" };
const modeLabel = (m: "dine-in" | "take-away") => (m === "dine-in" ? "Dine In" : "Take Away");

function useTick(ms = 1000) {
  const [, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

export function OrderHistoryScreen({ onStartOrdering }: { onStartOrdering: () => void }) {
  const { orders, push } = useApp();

  return (
    <ScreenShell title="Order History">
      {orders.length === 0 ? (
        <Empty icon={ReceiptText} title="No orders yet" body="Once you place an order it'll show up here." action={<Button onClick={onStartOrdering}>Start Ordering</Button>} />
      ) : (
        <div className="p-4">
          <Card>
            {orders.map((o) => {
              const st = orderState(o);
              return (
                <button key={o.id} onClick={() => push("orderDetail", { orderId: o.id })} className="block w-full border-b border-line p-4 text-left last:border-b-0 hover:bg-sunken">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      Order {o.id}
                      {st === "open" && <span className="t-num ml-2 rounded-sm bg-ink px-1.5 py-0.5 text-sm font-bold text-reward">Token {o.token}</span>}
                    </p>
                    <Badge tone={stateTone[st]}>{stateLabel[st]}</Badge>
                  </div>
                  <p className="text-sm text-ink-3">{fmtDate(o.placedAt)} · {modeLabel(o.mode)} · {o.store}</p>
                  <p className="mt-2 truncate text-sm text-ink-2">{o.lines.map((l) => `${l.quantity}× ${l.name}`).join(", ")}</p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="t-num font-bold text-brand-text">{aed(o.total)}</span>
                    {o.pointsEarned > 0 && st !== "cancelled" && <Badge tone={o.pointsCredited ? "reward" : "neutral"}>+{o.pointsEarned} pts{o.pointsCredited ? "" : " pending"}</Badge>}
                  </div>
                </button>
              );
            })}
          </Card>
        </div>
      )}
    </ScreenShell>
  );
}

/** Small copy-to-clipboard control for references the customer may need to quote. */
function CopyRef({ value, label }: { value: string; label: string }) {
  const { showToast } = useApp();
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(value).catch(() => {}); showToast(`${label} copied`); }}
      aria-label={`Copy ${label.toLowerCase()} ${value}`}
      className="-my-2 inline-flex items-center gap-1.5 py-2 font-mono text-sm text-ink"
    >
      {value} <Copy className="h-3.5 w-3.5 text-ink-3" />
    </button>
  );
}

const Perforation = () => <div aria-hidden className="my-3 border-t border-dashed border-line-strong/50" />;

export function OrderDetailScreen({ params, onOrderAgain }: { params: { orderId: string }; onOrderAgain: () => void }) {
  const { orders, cancelOrder, completeOrder, adjustPoints, adjustWallet, addLine, push, showToast } = useApp();
  const [confirmCancel, setConfirmCancel] = useState(false);
  useTick();

  const order = orders.find((o) => o.id === params.orderId);
  if (!order) {
    return <ScreenShell title="Order Details"><Empty title="We couldn't find what you're looking for." /></ScreenShell>;
  }

  const st = orderState(order);
  const secondsLeft = Math.max(0, Math.ceil((order.placedAt + CANCEL_WINDOW_MS - Date.now()) / 1000));
  const canCancel = st === "open" && secondsLeft > 0;
  const cancelled = st === "cancelled";
  const phone = storePhone(order.store);
  const itemCount = order.lines.reduce((n, l) => n + l.quantity, 0);

  const doCancel = () => {
    cancelOrder(order.id);
    if (order.pointsRedeemed > 0) adjustPoints(order.pointsRedeemed, `Order ${order.id}`, "Order Cancelled · points returned", "earned", false);
    if (order.walletUsed > 0) adjustWallet(order.walletUsed, `Order ${order.id} cancelled · refunded`);
    setConfirmCancel(false);
    showToast("Order Cancelled");
  };

  const orderAgain = () => {
    order.lines.filter((l) => l.productId > 0).forEach((l) => addLine({ productId: l.productId, name: l.name, unitPrice: l.unitPrice, img: l.img, quantity: l.quantity, mods: l.mods }));
    showToast("Added to cart");
    onOrderAgain();
  };

  const shareReceipt = async () => {
    const text = [
      `Jollibee UAE · Order ${order.id}`,
      `${fmtDateTime(order.placedAt)} · ${modeLabel(order.mode)} · ${order.store}`,
      ...order.lines.map((l) => `${l.quantity}x ${l.name}  ${aed(l.unitPrice * l.quantity)}`),
      `Total ${aed(order.total)}`,
    ].join("\n");
    try {
      if (navigator.share) await navigator.share({ title: `Order ${order.id}`, text });
      else { await navigator.clipboard?.writeText(text); showToast("Receipt copied"); }
    } catch { /* the customer closed the share sheet */ }
  };

  return (
    <ScreenShell
      title="Order Receipt"
      right={<IconButton icon={Share2} label="Share receipt" onClick={shareReceipt} />}
      footer={<Button variant={st === "open" ? "secondary" : "primary"} onClick={orderAgain}>Order Again</Button>}
    >
      {/* While the order is open, its token is the headline. Afterwards the receipt takes over. */}
      {st === "open" && (
        <div className="px-4 pt-4">
          <div className="rounded-lg border-2 border-dashed border-ink bg-reward px-4 py-5 text-center text-ink shadow-card">
            <p className="t-label">Your token number</p>
            <p className="t-num text-7xl font-bold leading-none tracking-tight" aria-label={`Token number ${order.token}`}>{order.token}</p>
            <p className="mt-3 text-sm">Collect at the counter when this number is called. Most orders are ready in 5–7 minutes.</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" disabled={!canCancel} onClick={() => setConfirmCancel(true)} aria-label={canCancel ? `Cancel order, ${secondsLeft} seconds left` : "Can't cancel now"}>
              {canCancel ? `Cancel · ${secondsLeft}s` : "Can't cancel now"}
            </Button>
            <Button onClick={() => { completeOrder(order.id); showToast("Enjoy your meal!"); }}>I've collected it</Button>
          </div>
        </div>
      )}

      {/* The receipt: one card, read top to bottom — what, how much, how it was paid */}
      <div className="px-4 pt-4">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="t-label text-ink-3">Order</p>
              <CopyRef value={order.id} label="Order number" />
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              <Badge tone={stateTone[st]}>{stateLabel[st]}</Badge>
              <Badge tone={cancelled ? "neutral" : "success"}>{cancelled ? "Refunded" : "Paid"}</Badge>
            </div>
          </div>
          <p className="mt-2 font-semibold">{order.store}</p>
          <p className="t-num text-sm text-ink-3">
            {fmtDateTime(order.placedAt)} · {modeLabel(order.mode)}{st !== "open" && ` · Token ${order.token}`}
          </p>

          <Perforation />

          <p className="t-label mb-1 text-ink-3">{itemCount} {itemCount === 1 ? "item" : "items"}</p>
          {order.lines.map((l) => (
            <div key={l.lineId} className="flex justify-between gap-3 py-1.5">
              <span className="min-w-0">
                <span className="block"><span className="t-num font-semibold">{l.quantity}×</span> {l.name}</span>
                {l.mods.length > 0 && <span className="block text-sm text-ink-3">{l.mods.join(", ")}</span>}
              </span>
              <span className="t-num whitespace-nowrap">{l.unitPrice === 0 ? "Free" : aed(l.unitPrice * l.quantity)}</span>
            </div>
          ))}

          <Perforation />

          <Line label="Subtotal" value={aed(order.subtotal)} />
          {order.discount > 0 && <Line label={`Discount · ${order.couponCode ?? "coupon"}`} value={`− ${aed(order.discount)}`} tone="success" />}
          <Line label="VAT (5%)" value={aed(order.vat)} />
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-semibold">Total</span>
            <span className={`t-num t-h2 ${cancelled ? "text-ink-3 line-through" : "text-brand-text"}`}>{aed(order.total)}</span>
          </div>

          <Perforation />

          <p className="t-label mb-1 text-ink-3">{cancelled ? "Refunded to" : "Paid with"}</p>
          {order.pointsRedeemed > 0 && <Line label={`Joy Points · ${order.pointsRedeemed} pts`} value={aed(order.pointsRedeemed * POINT_VALUE)} />}
          {order.walletUsed > 0 && <Line label="Money Wallet" value={aed(order.walletUsed)} />}
          {order.cardCharged > 0 && <Line label={order.paidWith} value={aed(order.cardCharged)} />}
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-sm text-ink-3">Transaction ref</span>
            <CopyRef value={order.ref} label="Transaction ref" />
          </div>
        </Card>
      </div>

      {!cancelled && order.pointsEarned > 0 && (
        <div className="px-4 pt-3">
          <Card className="flex items-center gap-3 border-reward bg-reward-subtle p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold"><span className="t-num text-brand-text">+{order.pointsEarned} pts</span> {order.pointsCredited ? "credited" : "pending"}</p>
              <p className="text-sm text-ink-2">{order.pointsCredited ? "Added to your Jolli Wallet." : POINTS_LATER}</p>
            </div>
            {order.pointsCredited && <Link onClick={() => push("wallet")}>View wallet</Link>}
          </Card>
        </div>
      )}

      <Section title="Need help with this order?">
        <Card>
          {phone && (
            <Row icon={Phone} tint="success" label="Call the store" sub={phone} onClick={() => { window.location.href = `tel:${phone.replace(/\s/g, "")}`; }} />
          )}
          <Row icon={MessageCircle} tint="accent" label="Contact support" sub="9am – 11pm daily" onClick={() => push("helpSupport")} />
        </Card>
        <p className="mt-2 text-xs text-ink-3">Have your order number ready: {order.id}</p>
        <div className="h-6" />
      </Section>

      <Confirm
        open={confirmCancel} title="Cancel this order?"
        message="Orders can be cancelled within 60 seconds of placement. After that, please call the store directly."
        confirmLabel="Cancel order" cancelLabel="Keep it"
        onCancel={() => setConfirmCancel(false)} onConfirm={doCancel}
      />
    </ScreenShell>
  );
}
