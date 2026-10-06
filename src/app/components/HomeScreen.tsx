import { Bell, ChevronRight, Drumstick, Gift, QrCode, ReceiptText, Store, Tag, User, Wallet } from "lucide-react";
import beeSaucyImage from "figma:asset/741e8721b35727ec171377a8647e08ad0d6427d1.png";
import sweetPotatoImage from "figma:asset/8b002bbaa9e75770608605b17601fddda67e8c36.png";
import sportingEventImage from "figma:asset/c767842c64f67737b8437d5659d51b2e52bfadcd.png";
import { REWARD_GOAL, useApp } from "../store";
import { products } from "../menu";
import { useAddProduct } from "./flow/ItemDetail";
import { ProductRow } from "./ProductRow";
import { Badge, Button, Card, CountUp, HeaderGlow, IconChip, Link, Progress, Section, Thumb, type Tint } from "./ds";

interface HomeScreenProps {
  onProfileClick?: () => void;
  onNavigate?: (tab: "order" | "scan" | "stores") => void;
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
};

export function HomeScreen({ onProfileClick, onNavigate }: HomeScreenProps) {
  const { points, profile, unreadCount, lifetimePoints, selectedStore, push } = useApp();
  const addProduct = useAddProduct();

  const freeRewards = Math.floor(points / REWARD_GOAL.points);
  const toReward = freeRewards > 0 ? 0 : REWARD_GOAL.points - points;

  const deal = products.find((p) => p.id === 12)!;
  const orderAgain = [products.find((p) => p.id === 3)!, products.find((p) => p.id === 2)!];

  const shortcuts: { icon: typeof Wallet; label: string; to: "wallet" | "giftCards" | "receiptScan" | "coupons"; tint: Tint }[] = [
    { icon: Wallet, label: "Wallet", to: "wallet", tint: "brand" },
    { icon: Gift, label: "Gift Cards", to: "giftCards", tint: "accent" },
    { icon: ReceiptText, label: "Receipts", to: "receiptScan", tint: "success" },
    { icon: Tag, label: "Coupons", to: "coupons", tint: "reward" },
  ];

  return (
    <div className="min-h-full bg-bg pb-6">
      {/* Red header: greeting, balance, and the three things people come here to do */}
      <div className="relative overflow-hidden rounded-b-xl bg-brand-gradient px-4 pb-5 pt-6 text-white">
        <HeaderGlow />
        <div className="relative">
          <div className="flex items-center gap-1">
            <p className="min-w-0 flex-1 truncate font-medium">{greeting()}, {profile.firstName}</p>
            <button
              onClick={() => push("notifications")}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span key={unreadCount} className="anim-pop t-num absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-reward px-1 text-xs font-bold text-ink">
                  {unreadCount}
                </span>
              )}
            </button>
            <button onClick={onProfileClick} aria-label="Open profile" className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
              <User className="h-5 w-5" />
            </button>
          </div>

          <p className="t-h2 mt-1">{toReward > 0 ? "Time to earn some points" : "Your free treat is ready"}</p>

          <div className="stagger mt-4 grid grid-cols-3 gap-3">
            <button onClick={() => onNavigate?.(selectedStore ? "order" : "stores")} aria-label="Order" className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg bg-reward text-ink shadow-card hover:bg-zest">
              <Drumstick className="h-7 w-7" />
              <span className="text-sm font-bold">Order</span>
            </button>
            <button onClick={() => onNavigate?.("scan")} aria-label="Scan QR code" className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg bg-surface text-brand-text shadow-card hover:bg-brand-subtle">
              <QrCode className="h-7 w-7" />
              <span className="text-sm font-bold">Scan</span>
            </button>
            <button onClick={() => onNavigate?.("stores")} aria-label="Stores" className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg bg-surface px-2 text-brand-text shadow-card hover:bg-brand-subtle">
              <Store className="h-7 w-7" />
              <span className="text-sm font-bold">Stores</span>
            </button>
          </div>
        </div>
      </div>

      <div className="stagger">
        {/* Progress to the next free reward, with history one tap away */}
        <div className="px-4 pt-4">
          <Card>
            <div className="flex items-center gap-4 bg-reward-subtle p-4">
              <button onClick={() => push("wallet")} aria-label={`${freeRewards} free ${REWARD_GOAL.name} available. Open Jolli Wallet`} className="flex-shrink-0">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-reward text-brand-deep"><Drumstick className="h-8 w-8" /></span>
                <span className="mt-1 block text-center text-xs font-semibold">Free {REWARD_GOAL.name}</span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="t-num">
                  <span className="t-h1 text-brand-text"><CountUp value={points} /></span>
                  <span className="t-h3 text-ink-2"> / {REWARD_GOAL.points}</span>
                </p>
                <div className="mt-1"><Progress value={((points % REWARD_GOAL.points) / REWARD_GOAL.points) * 100} tone="reward" /></div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="t-num text-sm text-ink-2">Total: {lifetimePoints.toLocaleString()}</span>
                  <Link onClick={() => push("pointsHistory")} className="flex items-center">View History <ChevronRight className="h-4 w-4" /></Link>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1 p-2">
              {shortcuts.map((a) => (
                <button key={a.to} onClick={() => push(a.to)} className="flex flex-col items-center gap-1.5 rounded-md px-1 py-2 hover:bg-sunken">
                  <IconChip icon={a.icon} tint={a.tint} size="lg" />
                  <span className="text-center text-xs font-semibold leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* The three campaign cards */}
        <div className="space-y-3 px-4 pt-6">
          <Card>
            <img src={sweetPotatoImage} alt="Fried Chicken with Sweet Potato" className="h-40 w-full object-cover" />
            <div className="flex items-center gap-2 px-4 py-3">
              <Badge tone="hot">New</Badge>
              <p className="font-semibold">Fried Chicken with Sweet Potato</p>
            </div>
          </Card>

          <Card>
            <img src={sportingEventImage} alt="Sporting event campaign" className="h-40 w-full object-cover" />
            <p className="px-4 py-3 font-semibold">Fried for the Biggest Sporting Event.</p>
          </Card>

          <Card>
            <div className="relative h-44">
              <img src={beeSaucyImage} alt="Bee Saucy" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex h-20 items-end bg-gradient-to-t from-ink/80 to-transparent px-4 pb-3">
                <h2 className="t-h3 text-white">Today's Deal</h2>
              </div>
            </div>
            <div className="p-4">
              <button onClick={() => addProduct(deal)} aria-label={`View ${deal.name}`} className="flex w-full items-center gap-3 text-left">
                <Thumb src={deal.img} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-snug">{deal.name}</span>
                  <span className="block text-sm text-ink-3">With fries & drink</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="t-num text-sm text-ink-3 line-through">35 AED</span>
                    <span className="t-num t-h3 text-brand-text">{deal.price} AED</span>
                    <Badge tone="hot">-20%</Badge>
                  </span>
                </span>
              </button>
              <Button className="mt-4" onClick={() => addProduct(deal)}>Add to Cart</Button>
            </div>
          </Card>
        </div>

        <Section title="Order Again" action={<Link onClick={() => push("orderHistory")}>See all</Link>}>
          <Card>
            {orderAgain.map((p) => (
              <ProductRow key={p.id} product={p} onOpen={() => addProduct(p)} onAdd={() => addProduct(p, { quick: true })} />
            ))}
          </Card>
        </Section>
      </div>
    </div>
  );
}
