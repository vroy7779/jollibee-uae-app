import { useRef, useState } from "react";
import { X } from "lucide-react";
import { aed, useApp } from "../../store";
import { descriptionFor, modifierGroupsFor, productById, type ModifierGroup, type Product } from "../../menu";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Badge, Button, Card, Choice, Empty, IconButton, Section, Stepper } from "../ds";

// Every add-to-cart entry point goes through here so the "store first" rule holds everywhere.
export function useAddProduct() {
  const { selectedStore, push, addLine, showToast } = useApp();
  return (product: Product, opts?: { quick?: boolean }) => {
    if (!selectedStore) {
      showToast("Pick a store before adding items");
      push("stores");
      return;
    }
    if (opts?.quick && modifierGroupsFor(product).length === 0) {
      addLine({ productId: product.id, name: product.name, unitPrice: product.price, img: product.img, quantity: 1, mods: [] });
      showToast("Added to cart");
      return;
    }
    push("item", { productId: product.id });
  };
}

const groupHint = (g: ModifierGroup) => {
  if (g.min > 0 && g.min === g.max) return `Required · pick ${g.min}`;
  if (g.min > 0) return `Required · pick ${g.min}–${g.max}`;
  return `Optional · up to ${g.max}`;
};

export function ItemDetailScreen({ params }: { params: { productId: number; lineId?: string } }) {
  const { cart, addLine, replaceLine, showToast, pop } = useApp();
  const product = productById(params.productId);
  const editing = cart.find((l) => l.lineId === params.lineId);
  const groups = product ? modifierGroupsFor(product) : [];

  // When editing a cart line, rebuild its selections from the option names stored on the line.
  const [picked, setPicked] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(groups.map((g) => [g.id, g.options.filter((o) => editing?.mods.includes(o.name)).map((o) => o.name)])),
  );
  const [qty, setQty] = useState(editing?.quantity ?? 1);
  const [showMissing, setShowMissing] = useState(false);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  if (!product) return <Drawer label="Menu item" onClose={pop}><div className="pt-10"><Empty title="We couldn't find what you're looking for." /></div></Drawer>;

  const toggle = (g: ModifierGroup, name: string) =>
    setPicked((prev) => {
      const cur = prev[g.id] ?? [];
      if (cur.includes(name)) return { ...prev, [g.id]: cur.filter((n) => n !== name) };
      if (g.max === 1) return { ...prev, [g.id]: [name] };
      if (cur.length >= g.max) return prev;
      return { ...prev, [g.id]: [...cur, name] };
    });

  const extras = groups.reduce(
    (sum, g) => sum + g.options.filter((o) => picked[g.id]?.includes(o.name)).reduce((s, o) => s + o.price, 0),
    0,
  );
  const unitPrice = product.price + extras;
  const missing = groups.filter((g) => (picked[g.id]?.length ?? 0) < g.min);
  const chosen = groups.flatMap((g) => picked[g.id] ?? []);

  const submit = () => {
    if (missing.length > 0) {
      setShowMissing(true);
      groupRefs.current[missing[0].id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const line = { productId: product.id, name: product.name, unitPrice, img: product.img, quantity: qty, mods: chosen };
    if (editing) replaceLine(editing.lineId, line);
    else addLine(line);
    showToast(editing ? "Cart updated" : "Added to cart");
    pop();
  };

  const renderGroups = (kind: ModifierGroup["kind"], heading: string) => {
    const list = groups.filter((g) => g.kind === kind);
    if (list.length === 0) return null;
    return (
      <Section title={heading}>
        <div className="space-y-3">
          {list.map((g) => {
            const count = picked[g.id]?.length ?? 0;
            const isMissing = showMissing && count < g.min;
            return (
              <div key={g.id} ref={(el) => { groupRefs.current[g.id] = el; }}>
                <Card className={isMissing ? "border-error" : ""}>
                  <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                    <p className="font-semibold">{g.title}</p>
                    {g.min > 0 && count >= g.min ? <Badge tone="success">Done</Badge> : <Badge tone={g.min > 0 ? "brand" : "neutral"}>{groupHint(g)}</Badge>}
                  </div>
                  {isMissing && <p role="alert" className="border-b border-line bg-error-subtle px-4 py-2 text-sm text-error">Choose {g.min} to continue</p>}
                  <div role={g.max === 1 ? "radiogroup" : "group"} aria-label={g.title}>
                    {g.options.map((o) => {
                      const on = picked[g.id]?.includes(o.name) ?? false;
                      return (
                        <Choice
                          key={o.name}
                          on={on}
                          shape={g.max === 1 ? "radio" : "check"}
                          label={o.name}
                          trailing={o.price > 0 ? `+${aed(o.price)}` : "Included"}
                          disabled={!on && g.max > 1 && count >= g.max}
                          onClick={() => toggle(g, o.name)}
                        />
                      );
                    })}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </Section>
    );
  };

  return (
    <Drawer label={product.name} onClose={pop}
      footer={
        <div className="flex items-center gap-3">
          <Stepper qty={qty} onDec={() => setQty((q) => Math.max(1, q - 1))} onInc={() => setQty((q) => q + 1)} />
          <Button onClick={submit}>
            {editing ? "Update cart" : "Add to cart"} · <span key={unitPrice * qty} className="anim-pop t-num">{aed(unitPrice * qty)}</span>
          </Button>
        </div>
      }
    >
      <div className="h-44 bg-sunken">
        <ImageWithFallback src={product.img} alt={product.name} className="h-full w-full object-cover" />
      </div>
      <div className="relative -mt-4 rounded-t-xl bg-surface px-4 py-4 shadow-card">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="t-h2">{product.name}</h2>
          <span className="t-num t-h2 whitespace-nowrap text-brand-text">{aed(product.price)}</span>
        </div>
        <p className="mt-1 text-sm text-ink-2">{descriptionFor(product)}</p>
        {chosen.length > 0 && <p className="mt-2 rounded-md bg-reward-subtle px-3 py-2 text-sm font-medium">{chosen.join(" · ")}</p>}
      </div>

      {groups.length === 0 && <p className="px-4 pt-4 text-sm text-ink-3">No add-ons for this item.</p>}
      {renderGroups("modifier", "Make it yours")}
      {renderGroups("addon", "Add-ons")}
      <div className="h-6" />
    </Drawer>
  );
}

/** Bottom drawer: slides up over the screen it was opened from, which stays visible behind it. */
function Drawer({ label, onClose, footer, children }: { label: string; onClose: () => void; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-[70] flex flex-col justify-end">
      <button aria-label="Close" className="anim-fade absolute inset-0 bg-ink/50 active:!transform-none" onClick={onClose} />
      <div role="dialog" aria-label={label} className="anim-sheet relative flex max-h-[90%] flex-col overflow-hidden rounded-t-xl bg-bg shadow-float">
        <span aria-hidden className="absolute left-1/2 top-2 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-white/90 shadow-card" />
        <IconButton icon={X} label="Close" onClick={onClose} className="absolute right-3 top-3 z-10 !rounded-full bg-surface shadow-card" />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-line bg-surface px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}
