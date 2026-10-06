import { Heart } from "lucide-react";
import { type Product, descriptionFor } from "../menu";
import { Button, Stepper, Thumb } from "./ds";

/** One menu item as a list row: the text opens the item, the control on the right adds it. */
export function ProductRow({
  product,
  qty = 0,
  onOpen,
  onAdd,
  onRemove,
}: {
  product: Product;
  qty?: number;
  onOpen: () => void;
  onAdd: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <button onClick={onOpen} aria-label={`View ${product.name}`} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Thumb src={product.img} />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 font-semibold leading-snug">{product.name}</span>
          <span className="block truncate text-sm text-ink-3">{descriptionFor(product)}</span>
          <span className="t-num mt-0.5 block font-semibold text-brand-text">AED {product.price}</span>
        </span>
      </button>
      {qty > 0 && onRemove ? (
        <Stepper qty={qty} onDec={onRemove} onInc={onAdd} />
      ) : (
        <Button variant="secondary" size="sm" fit onClick={onAdd} aria-label={`Add ${product.name}`}>Add</Button>
      )}
    </div>
  );
}

/** Menu grid tile: photo, name and price. Tapping opens the item; the heart saves it to My Favorites. */
export function ProductTile({
  product,
  qty = 0,
  favorite,
  onOpen,
  onToggleFavorite,
}: {
  product: Product;
  qty?: number;
  favorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-surface shadow-card">
      <button onClick={onOpen} aria-label={`View ${product.name}`} className="block w-full text-left">
        <div className="aspect-[4/3] bg-sunken">
          <img src={product.img} alt="" loading="lazy" className="h-full w-full object-cover" />
        </div>
        <div className="p-3">
          <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-tight">{product.name}</p>
          <p className="t-num mt-1 font-bold text-brand-text">AED {product.price}</p>
        </div>
      </button>
      <button
        onClick={onToggleFavorite}
        aria-pressed={favorite}
        aria-label={favorite ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-card"
      >
        <Heart key={String(favorite)} className={`h-5 w-5 ${favorite ? "anim-pop fill-brand text-brand" : "text-ink-3"}`} />
      </button>
      {qty > 0 && (
        <span key={qty} className="anim-pop t-num absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-brand px-2 text-sm font-bold text-white" aria-label={`${qty} in cart`}>
          {qty}
        </span>
      )}
    </div>
  );
}
