import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { aed, useApp, type CartLine } from "../../store";
import { modifierGroupsFor, productById, products } from "../../menu";
import { useAddProduct } from "./ItemDetail";
import { Button, Card, Confirm, Empty, Line, Link, ScreenShell, Section, Segmented, Stepper, Thumb } from "../ds";

export function CartScreen({ onBrowseMenu }: { onBrowseMenu: () => void }) {
  const {
    cart, cartSubtotal, cartCount, changeLineQty, removeLine, clearCart, addLine, orders,
    selectedStore, orderMode, setOrderMode, push, showToast,
  } = useApp();
  const addProduct = useAddProduct();
  const [discard, setDiscard] = useState(false);
  const [removing, setRemoving] = useState<CartLine | null>(null);

  const lastOrder = orders.find((o) => o.status !== "cancelled");
  const suggestions = products.filter((p) => !cart.some((l) => l.productId === p.id)).slice(0, 4);

  const checkout = () => {
    if (!selectedStore) {
      showToast("Pick a store before checking out");
      return push("stores");
    }
    push("checkout");
  };

  if (cart.length === 0) {
    return (
      <ScreenShell title="Your cart">
        <Empty icon={ShoppingBag} title="Your cart is empty" body="Add something from the menu to start an order." action={<Button onClick={onBrowseMenu}>Start Ordering</Button>} />

        {lastOrder && (
          <Section title="Order again">
            <Card className="p-4">
              <p className="font-semibold">Order {lastOrder.id}</p>
              <p className="truncate text-sm text-ink-3">{lastOrder.lines.map((l) => `${l.quantity}× ${l.name}`).join(", ")}</p>
              <Button
                variant="secondary"
                className="mt-3"
                onClick={() => {
                  lastOrder.lines.filter((l) => l.productId > 0).forEach(({ lineId: _lineId, ...l }) => addLine(l));
                  showToast("Added to cart");
                }}
              >
                Add these items
              </Button>
            </Card>
          </Section>
        )}
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Your cart"
      right={<Link className="px-2" onClick={() => setDiscard(true)}>Remove all</Link>}
      footer={<Button onClick={checkout}>Checkout · {aed(cartSubtotal)}</Button>}
    >
      <Section title="Store">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-3">
            <p className="min-w-0 flex-1 truncate font-semibold">{selectedStore || "No store selected"}</p>
            <Link onClick={() => push("stores")}>{selectedStore ? "Change" : "Select Store"}</Link>
          </div>
          <Segmented
            label="Order mode" value={orderMode} onChange={setOrderMode}
            options={[{ id: "dine-in", label: "Dine In" }, { id: "take-away", label: "Take Away" }]}
          />
        </Card>
      </Section>

      <Section title={`Items (${cartCount})`}>
        <Card>
          {cart.map((l) => {
            const product = productById(l.productId);
            const editable = product && modifierGroupsFor(product).length > 0;
            return (
              <div key={l.lineId} className="border-b border-line p-4 last:border-b-0">
                <div className="flex gap-3">
                  <Thumb src={l.img} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{l.name}</p>
                    {l.mods.length > 0 && <p className="truncate text-sm text-ink-3">{l.mods.join(", ")}</p>}
                    <p className="t-num text-sm text-ink-3">{aed(l.unitPrice)} each</p>
                  </div>
                  <span key={l.quantity} className="anim-pop t-num font-bold text-brand-text">{aed(l.unitPrice * l.quantity)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-4">
                    {editable && (
                      <Link onClick={() => push("item", { productId: l.productId, lineId: l.lineId })} aria-label={`Edit ${l.name}`}>Edit</Link>
                    )}
                    <Link className="!text-ink-2" onClick={() => setRemoving(l)} aria-label={`Remove ${l.name}`}>Remove</Link>
                  </div>
                  <Stepper qty={l.quantity} onDec={() => (l.quantity === 1 ? setRemoving(l) : changeLineQty(l.lineId, -1))} onInc={() => changeLineQty(l.lineId, 1)} />
                </div>
              </div>
            );
          })}
        </Card>
      </Section>

      {suggestions.length > 0 && (
        <Section title="From the menu">
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4">
            {suggestions.map((p) => (
              <button key={p.id} onClick={() => addProduct(p, { quick: true })} aria-label={`Add ${p.name}`} className="w-32 flex-shrink-0 text-left">
                <div className="h-20 overflow-hidden rounded-lg bg-sunken shadow-card"><img src={p.img} alt="" className="h-full w-full object-cover" /></div>
                <p className="mt-1.5 truncate text-sm font-medium">{p.name}</p>
                <p className="t-num text-sm font-semibold text-brand-text">AED {p.price}</p>
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Summary">
        <Card className="p-4">
          <Line label="Subtotal" value={aed(cartSubtotal)} strong />
          <p className="mt-1 text-xs text-ink-3">VAT, offers and points are applied at checkout.</p>
        </Card>
        <div className="h-6" />
      </Section>

      <Confirm
        open={discard} title="Discard cart?" message="Remove all items from your order."
        confirmLabel="Remove all" cancelLabel="Keep it"
        onCancel={() => setDiscard(false)}
        onConfirm={() => { clearCart(); setDiscard(false); }}
      />
      <Confirm
        open={removing !== null} title={`Remove ${removing?.name ?? ""}?`} message="This takes the item out of your cart."
        confirmLabel="Remove" cancelLabel="Keep it"
        onCancel={() => setRemoving(null)}
        onConfirm={() => { removeLine(removing!.lineId); setRemoving(null); }}
      />
    </ScreenShell>
  );
}
