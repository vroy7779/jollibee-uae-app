import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LocateFixed, Search, SlidersHorizontal, Store } from "lucide-react";
import { useApp } from "../store";
import { Badge, Button, Choice, Empty, Line, Link, Sheet } from "./ds";

interface StoreInfo {
  name: string;
  shortName: string;
  address: string;
  distance: string;
  hours: string;
  phone: string;
  lat: number;
  lng: number;
  openNow: boolean;
  facilities: string[];
}

const storesList: StoreInfo[] = [
  { name: "Jollibee Dubai Mall", shortName: "Dubai Mall - 124th shop", address: "Ground Floor, Dubai Mall, Downtown Dubai", distance: "2.3 km", hours: "Open until 11:00 PM", phone: "+971 4 123 4567", lat: 25.1972, lng: 55.2744, openNow: true, facilities: ["Dine In", "Take Away"] },
  { name: "Jollibee Marina Mall", shortName: "Marina Mall - Shop 45", address: "Dubai Marina Mall, Sheikh Zayed Road", distance: "5.1 km", hours: "Open until 10:30 PM", phone: "+971 4 234 5678", lat: 25.0764, lng: 55.1404, openNow: true, facilities: ["Dine In", "Take Away"] },
  { name: "Jollibee Ibn Battuta Mall", shortName: "Ibn Battuta - Shop 78", address: "Ibn Battuta Mall, Jebel Ali", distance: "8.7 km", hours: "Open until 12:00 AM", phone: "+971 4 345 6789", lat: 25.0443, lng: 55.1202, openNow: true, facilities: ["Take Away"] },
  { name: "Jollibee Festival City", shortName: "Festival City - Shop 12", address: "Dubai Festival City Mall, Al Kheeran", distance: "12.4 km", hours: "Open until 11:00 PM", phone: "+971 4 456 7890", lat: 25.2218, lng: 55.3525, openNow: true, facilities: ["Dine In", "Take Away"] },
  { name: "Jollibee Mirdif City Centre", shortName: "Mirdif Centre - Shop 56", address: "Mirdif City Centre, Mirdif", distance: "15.2 km", hours: "Opens at 10:00 AM", phone: "+971 4 567 8901", lat: 25.2165, lng: 55.4076, openNow: false, facilities: ["Dine In"] },
];

/** Phone number of a store, looked up by the short name saved on an order. */
export const storePhone = (shortName: string) => storesList.find((s) => s.shortName === shortName)?.phone;

// Bounds of the schematic map. A real map needs a Maps key, which the shipped app also leaves empty.
const BOUNDS = { west: 55.04, east: 55.48, south: 24.99, north: 25.37 };
const pinPos = (s: StoreInfo) => ({
  left: `${((s.lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * 100}%`,
  top: `${((BOUNDS.north - s.lat) / (BOUNDS.north - BOUNDS.south)) * 100}%`,
});

const FILTERS = [
  { id: "openNow", label: "Open Now", test: (s: StoreInfo) => s.openNow },
  { id: "dineIn", label: "Dine In", test: (s: StoreInfo) => s.facilities.includes("Dine In") },
  { id: "takeAway", label: "Take Away", test: (s: StoreInfo) => s.facilities.includes("Take Away") },
];

export function StoresScreen({ onClose, onSelectStore }: { onClose?: () => void; onSelectStore?: (store: string) => void }) {
  const { selectedStore, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [active, setActive] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [detail, setDetail] = useState<StoreInfo | null>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const q = searchQuery.trim().toLowerCase();
  const stores = storesList.filter(
    (s) =>
      (s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q)) &&
      FILTERS.filter((f) => active.includes(f.id)).every((f) => f.test(s)),
  );

  const focusPin = (s: StoreInfo) => {
    setFocused(s.name);
    rowRefs.current[s.name]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="flex min-h-14 items-center bg-brand px-2 pb-1 pt-6 text-white">
        <button onClick={onClose} aria-label="Close stores" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/15"><ChevronLeft className="h-5 w-5" /></button>
        <h1 className="t-h3 flex-1 text-center uppercase tracking-wide">Select Store</h1>
        <span className="w-10" />
      </header>

      {/* Map with search, filters and locate floating over it */}
      <div className="relative h-64 flex-shrink-0 overflow-hidden bg-sunken">
        <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 0 H52 Q40 28 22 52 Q10 70 0 78 Z" className="fill-brand-subtle" />
          <path d="M100 18 Q70 34 46 58 Q28 78 8 100" className="fill-none stroke-surface" strokeWidth="2.4" />
          <path d="M100 44 Q76 52 60 72 Q52 86 50 100" className="fill-none stroke-surface" strokeWidth="1.4" />
          <path d="M58 0 Q62 26 86 40 L100 46" className="fill-none stroke-surface" strokeWidth="1.4" />
          <path d="M62 30 Q70 36 74 48" className="fill-none stroke-reward" strokeWidth="1.6" />
        </svg>

        {stores.map((s) => {
          const on = focused === s.name || selectedStore === s.shortName;
          return (
            <button
              key={s.name} onClick={() => focusPin(s)} aria-label={`${s.name}, ${s.distance}`} style={pinPos(s)}
              className={`absolute flex -translate-x-1/2 -translate-y-full items-center justify-center rounded-full border-2 border-white shadow-card transition-all duration-200 ${on ? "z-10 h-11 w-11 bg-reward text-brand-deep" : "h-9 w-9 bg-brand text-white"}`}
            >
              <Store className="h-5 w-5" />
            </button>
          );
        })}

        <div className="absolute inset-x-3 top-3 flex gap-2">
          <button onClick={() => setFiltersOpen(true)} aria-label={active.length ? `Filters, ${active.length} active` : "Filters"} className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-brand text-white shadow-card">
            <SlidersHorizontal className="h-5 w-5" />
            {active.length > 0 && <span className="anim-pop t-num absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-reward px-1 text-xs font-bold text-ink">{active.length}</span>}
          </button>
          <div className="relative flex-1">
            <input
              type="search" aria-label="Search for stores" placeholder="Search for stores…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-md bg-surface pl-3 pr-12 shadow-card outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden"
            />
            <span aria-hidden className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-md bg-brand text-white"><Search className="h-5 w-5" /></span>
          </div>
        </div>
        <button
          onClick={() => { setSearchQuery(""); setFocused(stores[0]?.name ?? null); showToast("Showing stores nearest to you"); }}
          aria-label="Use my location" className="absolute bottom-6 right-3 flex h-11 w-11 items-center justify-center rounded-md bg-brand text-white shadow-card"
        >
          <LocateFixed className="h-5 w-5" />
        </button>
      </div>

      {/* Store list as a sheet riding over the map */}
      <div className="anim-sheet relative -mt-3 flex min-h-0 flex-1 flex-col rounded-t-xl bg-surface shadow-float">
        <span aria-hidden className="mx-auto my-2 h-1 w-10 flex-shrink-0 rounded-full bg-line-strong" />
        {stores.length === 0 ? (
          <Empty icon={Search} title="We couldn’t find that store." body="Try a different search term or clear the filters." action={<Button variant="secondary" onClick={() => { setSearchQuery(""); setActive([]); }}>Reset All Filters</Button>} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <p className="px-4 pb-1 text-sm text-ink-3">{stores.length} {stores.length === 1 ? "store" : "stores"} nearby</p>
            {stores.map((s) => (
              <button
                key={s.name} ref={(el) => { rowRefs.current[s.name] = el; }} onClick={() => { setFocused(s.name); setDetail(s); }}
                className={`flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left ${focused === s.name ? "bg-reward-subtle" : "hover:bg-sunken"}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-bold">{s.name}</span>
                    {selectedStore === s.shortName && <Badge tone="hot">Selected</Badge>}
                  </span>
                  <span className="block truncate text-sm text-ink-2">{s.address}</span>
                  <span className="t-num block text-sm font-bold">{s.distance}</span>
                </span>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-brand-text" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Sheet open={detail !== null} onClose={() => setDetail(null)} title={detail?.name}>
        {detail && (
          <div>
            <p className="text-sm text-ink-2">{detail.address}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={detail.openNow ? "success" : "neutral"}>{detail.hours}</Badge>
              <Badge tone="reward">{detail.distance}</Badge>
              {detail.facilities.map((f) => <Badge key={f}>{f}</Badge>)}
            </div>
            <div className="mt-4 border-t border-line pt-2">
              <Line label="Phone" value={detail.phone} />
            </div>
            <div className="mt-2 flex gap-5">
              <Link onClick={() => { window.location.href = `tel:${detail.phone.replace(/\s/g, "")}`; }}>Call</Link>
              <Link onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${detail.name} ${detail.address}`)}`, "_blank", "noopener")}>Directions</Link>
            </div>
            <Button className="mt-5" disabled={!detail.openNow} onClick={() => { const pick = detail.shortName; setDetail(null); onSelectStore?.(pick); }} aria-label={`Order here: ${detail.name}`}>
              {detail.openNow ? "Order here" : "Closed right now"}
            </Button>
          </div>
        )}
      </Sheet>

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <div className="overflow-hidden rounded-lg border border-line">
          {FILTERS.map((f) => (
            <Choice key={f.id} on={active.includes(f.id)} label={f.label} onClick={() => setActive((a) => (a.includes(f.id) ? a.filter((x) => x !== f.id) : [...a, f.id]))} />
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={() => setActive([])}>Reset All Filters</Button>
          <Button onClick={() => setFiltersOpen(false)}>Show {stores.length}</Button>
        </div>
      </Sheet>
    </div>
  );
}
