import { useState } from "react";
import { ChevronDown, Heart, History, Search, X } from "lucide-react";
import { useApp } from "../store";
import { categories, products, type Product } from "../menu";
import { useAddProduct } from "./flow/ItemDetail";
import { ProductTile } from "./ProductRow";
import { Badge, Button, Empty, HeaderGlow, Segmented } from "./ds";

interface OrderScreenProps {
  onNavigate?: (tab: "stores") => void;
}

const FAVORITES = "My Favorites";
const POPULAR = "Most Ordered";

export function OrderScreen({ onNavigate }: OrderScreenProps) {
  const { selectedStore, cart, favorites, toggleFavorite, orderMode, setOrderMode, push } = useApp();
  const addProduct = useAddProduct();
  const tabs = [FAVORITES, POPULAR, ...categories];
  const [tab, setTab] = useState(favorites.length > 0 ? FAVORITES : POPULAR);
  const [query, setQuery] = useState("");

  const qtyOf = (id: number) => cart.filter((l) => l.productId === id).reduce((sum, l) => sum + l.quantity, 0);
  const searching = query.trim().length > 0;

  const list: Product[] = searching
    ? products.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : tab === FAVORITES ? products.filter((p) => favorites.includes(p.id))
    : tab === POPULAR ? products.filter((p) => p.mostOrdered)
    : products.filter((p) => p.category === tab);

  const familyBucket = products.find((p) => p.id === 3)!;

  return (
    <div className="min-h-full bg-bg">
      {/* Store in the title, order history on the left: the menu always says where you are ordering from */}
      <div className="relative overflow-hidden bg-brand-gradient px-2 pb-3 pt-6 text-white">
        <HeaderGlow />
        {/* How you're eating comes first: it is the first decision of the order and follows it to the end */}
        <div className="relative px-2 pb-2">
          <Segmented
            wide onBrand label="Order mode" value={orderMode} onChange={setOrderMode}
            options={[{ id: "dine-in", label: "Dine In" }, { id: "take-away", label: "Take Away" }]}
          />
        </div>
        <div className="relative flex items-center">
          <button onClick={() => push("orderHistory")} aria-label="Order History" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/15">
            <History className="h-5 w-5" />
          </button>
          <button onClick={() => onNavigate?.("stores")} aria-label={selectedStore ? `Store: ${selectedStore}. Change store` : "Select Store"} className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1 px-2">
            <span className="t-h3 truncate">{selectedStore || "Select Store"}</span>
            <ChevronDown className="h-5 w-5 flex-shrink-0" />
          </button>
          <span className="w-10" />
        </div>
      </div>

      {!selectedStore ? (
        <Empty
          icon={Search}
          title="Pick a store to see the menu"
          body="Menus and prices can differ between stores."
          action={<Button onClick={() => onNavigate?.("stores")}>Select Store</Button>}
        />
      ) : (
        <>
          <div className="sticky top-0 z-20 bg-surface shadow-card">
            <div className="relative border-b border-line">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-text" />
              <input
                type="search" aria-label="Search the menu" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)}
                className="h-12 w-full bg-transparent pl-12 pr-12 outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden"
              />
              {searching && (
                <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full hover:bg-sunken">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            {!searching && (
              <div role="tablist" aria-label="Menu categories" className="flex gap-5 overflow-x-auto px-4">
                {tabs.map((c) => (
                  <button
                    key={c} role="tab" aria-selected={tab === c} onClick={() => setTab(c)}
                    className={`h-11 flex-shrink-0 whitespace-nowrap border-b-[3px] text-sm ${tab === c ? "border-brand font-bold text-brand-text" : "border-transparent font-medium text-ink-3"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {searching && <p className="px-4 pt-4 text-sm text-ink-2">Results for "{query.trim()}"</p>}

          {list.length === 0 ? (
            searching ? (
              <Empty icon={Search} title="We couldn't find what you're looking for." body="Try a different search term." />
            ) : (
              <Empty
                icon={Heart}
                title="No favorites yet"
                body="Tap the heart on any item to keep it here for next time."
                action={<Button onClick={() => setTab(POPULAR)}>From the menu</Button>}
              />
            )
          ) : (
            <div key={searching ? "search" : tab} className="stagger grid grid-cols-2 gap-3 p-4">
              {list.map((p) => (
                <ProductTile
                  key={p.id} product={p} qty={qtyOf(p.id)} favorite={favorites.includes(p.id)}
                  onOpen={() => addProduct(p)} onToggleFavorite={() => toggleFavorite(p.id)}
                />
              ))}
            </div>
          )}

          {!searching && tab === POPULAR && (
            <div className="px-4 pb-6">
              <div className="relative overflow-hidden rounded-lg bg-brand-gradient p-4 text-white shadow-card">
                <HeaderGlow />
                <div className="relative">
                  <Badge tone="reward">Limited Offer</Badge>
                  <p className="t-h3 mt-2">Upgrade to Family Bucket</p>
                  <p className="text-sm">Add +20 AED and feed the whole family with 8 pieces of crispy Chickenjoy!</p>
                  <Button variant="reward" className="mt-3" onClick={() => addProduct(familyBucket)}>Upgrade Now</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
