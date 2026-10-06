import { useEffect, useState } from "react";
import { ReceiptText } from "lucide-react";
import { aed, CANCEL_WINDOW_MS, fmtDate, liveStatus, POINT_VALUE, useApp, type OrderStatus } from "../../store";
import { Badge, Button, Card, Confirm, Divider, Empty, Line, Link, Row, ScreenShell, Section } from "../ds";

const statusLabel: Record<OrderStatus, string> = {
  placed: "Placed", preparing: "Preparing", ready: "Ready", delivered: "Delivered", cancelled: "Cancelled",
};

const statusTone: Record<OrderStatus, "neutral" | "reward" | "success" | "brand"> = {
  placed: "neutral", preparing: "reward", ready: "success", delivered: "neutral", cancelled: "brand",
};

function useTick(ms = 1000) {
  const [, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

export function OrderHistoryScreen({ onStartOrdering }: { onStartOrdering: () => void }) {
  const { orders, push } = useApp();
  useTick(5000);

  return (
    <ScreenShell title="Order History">
      {orders.length === 0 ? (
        <Empty icon={ReceiptText} title="No orders yet" body="Once you place an order it'll show up here." action={<Button onClick={onStartOrdering}>Start Ordering</Button>} />
      ) : (
        <div className="p-4">
          <Card>
            {orders.map((o) => {
              const st = liveStatus(o);
              return (
                <button key={o.id} onClick={() => push("orderDetail", { orderId: o.id })} className="block w-full border-b border-line p-4 text-left last:border-b-0 hover:bg-sunken">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">Order {o.id}</p>
                    <Badge tone={statusTone[st]}>{statusLabel[st]}</Badge>
                  </div>
                  <p className="text-sm text-ink-3">{fmtDate(o.placedAt)} · {o.store}</p>
                  <p className="mt-2 truncate text-sm text-ink-2">{o.lines.map((l) => `${l.quantity}× ${l.name}`).join(", ")}</p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="t-num font-bold text-brand-text">{aed(o.total)}</span>
                    {o.pointsEarned > 0 && st !== "cancelled" && <Badge tone="reward">+{o.pointsEarned} pts</Badge>}
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

// The header takes the colour of the status, so the state of the order is readable from across the room.
const HEADER_TONE: Record<OrderStatus, string> = {
  placed: "bg-surface text-ink", preparing: "bg-reward text-ink", ready: "bg-success text-white",
  delivered: "bg-surface text-ink", cancelled: "bg-brand-subtle text-brand-text",
};

const TIMELINE: OrderStatus[] = ["placed", "preparing", "ready", "delivered"];

export function OrderDetailScreen({ params, onOrderAgain }: { params: { orderId: string }; onOrderAgain: () => void }) {
  const { orders, cancelOrder, adjustPoints, addLine, push, showToast } = useApp();
  const [confirmCancel, setConfirmCancel] = useState(false);
  useTick();

  const order = orders.find((o) => o.id === params.orderId);
  if (!order) {
    return <ScreenShell title="Order Details"><Empty title="We couldn't find what you're looking for." /></ScreenShell>;
  }

  const st = liveStatus(order);
  const stepIdx = TIMELINE.indexOf(st);
  const secondsLeft = Math.max(0, Math.ceil((order.placedAt + CANCEL_WINDOW_MS - Date.now()) / 1000));
  const canCancel = st === "placed" && secondsLeft > 0;

  const doCancel = () => {
    cancelOrder(order.id);
    if (order.pointsRedeemed > 0) adjustPoints(order.pointsRedeemed, `Order ${order.id}`, "Order Cancelled · points returned", "earned", false);
    setConfirmCancel(false);
    showToast("Order Cancelled");
  };

  const orderAgain = () => {
    order.lines.filter((l) => l.productId > 0).forEach((l) => addLine({ productId: l.productId, name: l.name, unitPrice: l.unitPrice, img: l.img, quantity: l.quantity, mods: l.mods }));
    showToast("Added to cart");
    onOrderAgain();
  };

  return (
    <ScreenShell title={`Order ${order.id}`} footer={<Button variant="secondary" onClick={orderAgain}>Order Again</Button>}>
      {/* Status is the reason this screen exists, so it leads */}
      <div className={`rounded-b-xl px-4 pb-5 pt-4 shadow-card ${HEADER_TONE[st]}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 key={st} className="anim-rise t-h1">{st === "cancelled" ? "Order Cancelled" : statusLabel[st]}</h2>
          {canCancel && <Button variant="secondary" size="sm" fit onClick={() => setConfirmCancel(true)}>Cancel order · {secondsLeft}s</Button>}
        </div>
        <p className="mt-1 text-sm">{fmtDate(order.placedAt)} · {order.store} · {order.mode === "dine-in" ? "Dine In" : "Take Away"}</p>

        {st !== "cancelled" && (
          <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Order status">
            {TIMELINE.map((s, i) => (
              <li key={s} aria-current={i === stepIdx ? "step" : undefined}>
                <span className="relative block h-2 rounded-full bg-current/25">
                  {i <= stepIdx && <span className="anim-grow absolute inset-0 rounded-full bg-current" />}
                  {i === stepIdx && st !== "delivered" && <span className="anim-ping absolute -right-0.5 -top-1 h-4 w-4 rounded-full bg-current" />}
                </span>
                <span className={`mt-1.5 block text-xs ${i === stepIdx ? "font-bold" : i < stepIdx ? "" : "opacity-70"}`}>{statusLabel[s]}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {st !== "cancelled" && order.pointsEarned > 0 && (
        <Section>
          <Card className="flex items-center gap-3 border-reward bg-reward-subtle p-4">
            <div className="min-w-0 flex-1">
              <p className="t-h3 text-brand-text">+{order.pointsEarned} pts</p>
              <p className="text-sm text-ink-2">
                {st === "delivered" ? "Added to your wallet." : "Lands in your wallet once the order is delivered."}
              </p>
            </div>
            {st === "delivered" && <Link onClick={() => push("wallet")}>View wallet</Link>}
          </Card>
        </Section>
      )}

      <Section title={`Items (${order.lines.reduce((s, l) => s + l.quantity, 0)})`}>
        <Card className="px-4 py-2">
          {order.lines.map((l) => (
            <div key={l.lineId} className="flex justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate">{l.quantity}× {l.name}</span>
                {l.mods.length > 0 && <span className="block truncate text-sm text-ink-3">{l.mods.join(", ")}</span>}
              </span>
              <span className="t-num">{aed(l.unitPrice * l.quantity)}</span>
            </div>
          ))}
        </Card>
      </Section>

      <Section title="Payment">
        <Card className="p-4">
          <Line label="Subtotal" value={aed(order.subtotal)} />
          {order.discount > 0 && <Line label={`Coupon ${order.couponCode ?? ""}`} value={`− ${aed(order.discount)}`} tone="success" />}
          <Line label="VAT (5%)" value={aed(order.vat)} />
          <Line label="Order Total" value={aed(order.total)} strong />
          <Divider />
          {order.giftCardUsed > 0 && <Line label="Gift card" value={aed(order.giftCardUsed)} />}
          {order.pointsRedeemed > 0 && <Line label={`Wallet Paid (${order.pointsRedeemed} pts)`} value={aed(order.pointsRedeemed * POINT_VALUE)} />}
          <Line label="Card Charged" value={aed(order.cardCharged)} />
          <Line label="Payment Method" value={order.paidWith} />
          <Line label="Transaction Ref" value={order.ref} />
          <Line label="Payment Status" value={st === "cancelled" ? "Refunded" : "Paid"} />
        </Card>
      </Section>

      <Section>
        <Card><Row label="Need help with this order?" onClick={() => push("helpSupport")} /></Card>
        <div className="h-6" />
      </Section>

      <Confirm
        open={confirmCancel} title="Cancel this order?"
        message="Orders can be cancelled within 60 seconds of placement. After that, please call the store directly via the Stores screen."
        confirmLabel="Cancel order" cancelLabel="Keep it"
        onCancel={() => setConfirmCancel(false)} onConfirm={doCancel}
      />
    </ScreenShell>
  );
}
