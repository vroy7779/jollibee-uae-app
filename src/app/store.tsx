import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

// 1 pt = AED 0.05 and VAT 5% — both taken from the copy in the shipped app.
export const POINT_VALUE = 0.05;
export const VAT_RATE = 0.05;
export const EARN_PER_AED = 1;
export const CANCEL_WINDOW_MS = 60_000;
const READY_MS = 120_000;
export const DELIVERED_MS = 150_000;

export const aed = (n: number) => `AED ${n.toFixed(2)}`;
export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Promo + gift card + Joy Points stacking is awaiting a business decision from Jollibee.
// Every rule the checkout applies is read from here so the answer is a config change, not a rewrite.
export const CHECKOUT_RULES = {
  promoWithPoints: true,
  promoWithGiftCard: true,
  giftCardWithPoints: true,
  // Share of the amount due that Joy Points may cover (1 = the whole order).
  maxPointsShare: 1,
};

export type ScreenName =
  | "stores" | "item" | "cart"
  | "checkout" | "payment" | "paymentWebView" | "paymentSuccess"
  | "orderHistory" | "orderDetail"
  | "wallet" | "pointsHistory" | "tierBenefits" | "tierJourney" | "coupons"
  | "giftCards" | "myGiftCards" | "createGiftCard" | "giftCardDetail" | "addGiftCard"
  | "notifications" | "notificationDetail"
  | "personalInfo" | "notificationSettings" | "language" | "paymentMethods"
  | "helpSupport" | "accountDeletion" | "receiptScan";

export interface Screen { name: ScreenName; params?: any }

export interface CartLine {
  lineId: string;
  productId: number;
  name: string;
  unitPrice: number;
  img: string;
  quantity: number;
  mods: string[];
}

export type OrderStatus = "placed" | "preparing" | "ready" | "delivered" | "cancelled";
export type OrderMode = "dine-in" | "take-away";

export interface Order {
  id: string;
  ref: string;
  placedAt: number;
  store: string;
  mode: OrderMode;
  lines: CartLine[];
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  couponCode?: string;
  pointsRedeemed: number;
  giftCardUsed: number;
  cardCharged: number;
  paidWith: string;
  pointsEarned: number;
  status: OrderStatus;
}

// Orders placed in this session walk through the timeline on a clock; there is no backend to push updates.
export function liveStatus(o: Order, at = Date.now()): OrderStatus {
  if (o.status === "cancelled" || o.status === "delivered") return o.status;
  const age = at - o.placedAt;
  if (age < CANCEL_WINDOW_MS) return "placed";
  if (age < READY_MS) return "preparing";
  if (age < DELIVERED_MS) return "ready";
  return "delivered";
}

export type GiftCardStatus = "active" | "partially" | "fully" | "loaded" | "sent" | "expired";

export interface GiftCard {
  id: string;
  code: string;
  pin: string;
  amount: number;
  balance: number;
  status: GiftCardStatus;
  expires: number;
  recipient?: string;
  message?: string;
  design?: string;
  sendsLeft: number;
  tx: { label: string; amount: number; date: number; balanceAfter: number }[];
}

export interface PointsTx {
  id: string;
  label: string;
  sub: string;
  pts: number;
  date: number;
  kind: "earned" | "redeemed" | "bonus" | "held";
}

export interface Notif { id: string; title: string; body: string; date: number; read: boolean }
export interface SavedCard { id: string; brand: string; last4: string; expires: string; isDefault: boolean }

export interface Coupon {
  code: string;
  title: string;
  kind: "percent" | "amount" | "freeItem";
  value: number;
  minOrder: number;
  maxDiscount?: number;
  validTill: number;
}

export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  nationality: string;
  address: string;
  memberSince: number;
}

export interface NotifPrefs { push: boolean; inApp: boolean; promos: boolean; email: boolean }

const DAY = 86_400_000;
const now = Date.now();

export const COUPONS: Coupon[] = [
  { code: "JOY10", title: "10% off your order", kind: "percent", value: 10, minOrder: 30, maxDiscount: 15, validTill: now + 20 * DAY },
  { code: "SAVE5", title: "AED 5 off", kind: "amount", value: 5, minOrder: 40, validTill: now + 9 * DAY },
  { code: "FREEPIE", title: "Free Peach Mango Pie", kind: "freeItem", value: 6, minOrder: 25, validTill: now + 30 * DAY },
];

// Points needed for the headline free reward shown on Home and in the wallet.
export const REWARD_GOAL = { points: 600, name: "Chickenjoy" };

export const FREE_ITEMS = ["Peach Mango Pie", "Regular Fries", "Iced Tea"];

// Tier names and thresholds are placeholders: the real app loads them from the loyalty API.
export const TIERS = [
  { name: "Joy Starter", min: 0, perks: ["Earn 1 pt per AED 1", "Birthday surprise"] },
  { name: "Silver", min: 500, perks: ["Everything in Joy Starter", "Member-only coupons"] },
  { name: "Gold", min: 1500, perks: ["Everything in Silver", "Bonus points on combos", "Early access to offers"] },
  { name: "Platinum", min: 5000, perks: ["Everything in Gold", "Free item every quarter", "Priority support"] },
];

export const tierFor = (lifetime: number) => [...TIERS].reverse().find((t) => lifetime >= t.min)!;

interface AppState {
  stack: Screen[];
  push: (name: ScreenName, params?: any) => void;
  pop: () => void;
  replace: (name: ScreenName, params?: any) => void;
  popToRoot: () => void;
  resetTo: (name: ScreenName, params?: any) => void;

  toast: string | null;
  showToast: (msg: string) => void;

  selectedStore: string;
  setSelectedStore: (s: string) => void;
  orderMode: OrderMode;
  setOrderMode: (m: OrderMode) => void;

  favorites: number[];
  toggleFavorite: (productId: number) => void;

  cart: CartLine[];
  cartCount: number;
  cartSubtotal: number;
  addLine: (line: Omit<CartLine, "lineId">) => void;
  changeLineQty: (lineId: string, delta: number) => void;
  replaceLine: (lineId: string, line: Omit<CartLine, "lineId">) => void;
  removeLine: (lineId: string) => void;
  removeOneOfProduct: (productId: number) => void;
  clearCart: () => void;

  points: number;
  bonusPoints: number;
  lifetimePoints: number;
  pointsTx: PointsTx[];
  adjustPoints: (delta: number, label: string, sub: string, kind?: PointsTx["kind"], countsToLifetime?: boolean) => void;

  orders: Order[];
  addOrder: (o: Order) => void;
  notify: (title: string, body: string) => void;
  cancelOrder: (id: string) => void;

  giftCards: GiftCard[];
  setGiftCards: React.Dispatch<React.SetStateAction<GiftCard[]>>;

  notifications: Notif[];
  setNotifications: React.Dispatch<React.SetStateAction<Notif[]>>;
  unreadCount: number;

  savedCards: SavedCard[];
  setSavedCards: React.Dispatch<React.SetStateAction<SavedCard[]>>;

  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  notifPrefs: NotifPrefs;
  setNotifPrefs: React.Dispatch<React.SetStateAction<NotifPrefs>>;
  language: string;
  setLanguage: (l: string) => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}

let seq = 0;
export const uid = (p = "id") => `${p}-${Date.now().toString(36)}-${seq++}`;

const seedLines: CartLine[] = [
  { lineId: "s1", productId: 1, name: "2-Piece Chickenjoy", unitPrice: 18, img: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400", quantity: 2, mods: ["Spicy"] },
  { lineId: "s2", productId: 8, name: "Jolly Spaghetti", unitPrice: 15, img: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400", quantity: 1, mods: [] },
];

const seedOrders: Order[] = [
  {
    id: "JB-10482", ref: "NI-7F3A91C2", placedAt: now - 3 * DAY, store: "Dubai Mall - 124th shop", mode: "dine-in",
    lines: seedLines, subtotal: 51, discount: 0, vat: 2.55, total: 53.55, pointsRedeemed: 0, giftCardUsed: 0,
    cardCharged: 53.55, paidWith: "Visa ending 4242", pointsEarned: 53, status: "delivered",
  },
  {
    id: "JB-10311", ref: "NI-2B88D0E4", placedAt: now - 12 * DAY, store: "Marina Mall - Shop 45", mode: "take-away",
    lines: [seedLines[1]], subtotal: 15, discount: 0, vat: 0.75, total: 15.75, pointsRedeemed: 100, giftCardUsed: 0,
    cardCharged: 10.75, paidWith: "Visa ending 4242", pointsEarned: 10, status: "delivered",
  },
];

const seedGiftCards: GiftCard[] = [
  {
    id: "gc1", code: "1234-5678-9012-3456", pin: "482910", amount: 100, balance: 100, status: "active",
    expires: now + 300 * DAY, sendsLeft: 1,
    tx: [{ label: "Purchased", amount: 100, date: now - 5 * DAY, balanceAfter: 100 }],
  },
  {
    id: "gc2", code: "9876-5432-1098-7654", pin: "117733", amount: 50, balance: 18.5, status: "partially",
    expires: now + 120 * DAY, sendsLeft: 0,
    tx: [
      { label: "Redeemed", amount: -31.5, date: now - 2 * DAY, balanceAfter: 18.5 },
      { label: "Issued", amount: 50, date: now - 40 * DAY, balanceAfter: 50 },
    ],
  },
  {
    id: "gc3", code: "5555-0000-1111-2222", pin: "900145", amount: 25, balance: 0, status: "fully",
    expires: now + 60 * DAY, sendsLeft: 0,
    tx: [{ label: "Redeemed", amount: -25, date: now - 20 * DAY, balanceAfter: 0 }],
  },
];

const seedPointsTx: PointsTx[] = [
  { id: "p1", label: "Order JB-10482", sub: "Dubai Mall - 124th shop", pts: 53, date: now - 3 * DAY, kind: "earned" },
  { id: "p2", label: "Receipt points added", sub: "In-store purchase", pts: 24, date: now - 6 * DAY, kind: "earned" },
  { id: "p3", label: "Order JB-10311", sub: "Points used", pts: -100, date: now - 12 * DAY, kind: "redeemed" },
  { id: "p4", label: "Joined Jolli Club", sub: "Welcome bonus", pts: 50, date: now - 200 * DAY, kind: "bonus" },
];

const seedNotifs: Notif[] = [
  { id: "n1", title: "Your order is ready", body: "Order JB-10482 is ready for pickup at Dubai Mall - 124th shop.", date: now - 3 * DAY, read: false },
  { id: "n2", title: "Limited Offer", body: "Upgrade to Family Bucket: add +20 AED and feed the whole family with 8 pieces of crispy Chickenjoy!", date: now - 4 * DAY, read: false },
  { id: "n3", title: "Receipt points added", body: "24 pts were added to your wallet from your in-store purchase.", date: now - 6 * DAY, read: true },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<Screen[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const [selectedStore, setSelectedStore] = useState("");
  const [orderMode, setOrderMode] = useState<OrderMode>("dine-in");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<number[]>([1, 8]);
  const toggleFavorite = useCallback(
    (id: number) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
    [],
  );
  const [points, setPoints] = useState(480);
  const [bonusPoints] = useState(60);
  const [lifetimePoints, setLifetimePoints] = useState(1820);
  const [pointsTx, setPointsTx] = useState<PointsTx[]>(seedPointsTx);
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [giftCards, setGiftCards] = useState<GiftCard[]>(seedGiftCards);
  const [notifications, setNotifications] = useState<Notif[]>(seedNotifs);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([
    { id: "c1", brand: "Visa", last4: "4242", expires: "08/28", isDefault: true },
    { id: "c2", brand: "Mastercard", last4: "5100", expires: "11/27", isDefault: false },
  ]);
  const [profile, setProfile] = useState<Profile>({
    firstName: "Vaibhav", lastName: "Roy", email: "vaibhav@email.com", phone: "50 123 4567",
    dob: "1994-04-21", nationality: "United Arab Emirates", address: "", memberSince: now - 200 * DAY,
  });
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({ push: true, inApp: true, promos: true, email: false });
  const [language, setLanguage] = useState("English");

  const push = useCallback((name: ScreenName, params?: any) => setStack((s) => [...s, { name, params }]), []);
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const replace = useCallback((name: ScreenName, params?: any) => setStack((s) => [...s.slice(0, -1), { name, params }]), []);
  const popToRoot = useCallback(() => setStack([]), []);
  const resetTo = useCallback((name: ScreenName, params?: any) => setStack([{ name, params }]), []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const addLine = useCallback((line: Omit<CartLine, "lineId">) => {
    setCart((prev) => {
      const key = line.mods.join("|");
      const same = prev.find((l) => l.productId === line.productId && l.mods.join("|") === key);
      if (same) return prev.map((l) => (l === same ? { ...l, quantity: l.quantity + line.quantity } : l));
      return [...prev, { ...line, lineId: uid("line") }];
    });
  }, []);

  const changeLineQty = useCallback((lineId: string, delta: number) => {
    setCart((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, quantity: l.quantity + delta } : l)).filter((l) => l.quantity > 0),
    );
  }, []);

  const replaceLine = useCallback((lineId: string, line: Omit<CartLine, "lineId">) => {
    setCart((prev) => prev.map((l) => (l.lineId === lineId ? { ...line, lineId } : l)));
  }, []);

  const removeLine = useCallback((lineId: string) => setCart((prev) => prev.filter((l) => l.lineId !== lineId)), []);

  const notify = useCallback((title: string, body: string) => {
    setNotifications((prev) => [{ id: uid("n"), title, body, date: Date.now(), read: false }, ...prev]);
  }, []);

  const removeOneOfProduct = useCallback((productId: number) => {
    setCart((prev) => {
      const last = [...prev].reverse().find((l) => l.productId === productId);
      if (!last) return prev;
      return prev.map((l) => (l === last ? { ...l, quantity: l.quantity - 1 } : l)).filter((l) => l.quantity > 0);
    });
  }, []);

  const adjustPoints = useCallback((delta: number, label: string, sub: string, kind?: PointsTx["kind"], countsToLifetime = true) => {
    setPoints((p) => Math.max(0, p + delta));
    if (delta > 0 && countsToLifetime) setLifetimePoints((p) => p + delta);
    setPointsTx((t) => [
      { id: uid("pt"), label, sub, pts: delta, date: Date.now(), kind: kind ?? (delta >= 0 ? "earned" : "redeemed") },
      ...t,
    ]);
  }, []);

  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  const addOrder = useCallback((o: Order) => {
    setOrders((prev) => [o, ...prev]);
    // Points land once the order is delivered, unless it was cancelled in the meantime.
    setTimeout(() => {
      const current = ordersRef.current.find((x) => x.id === o.id);
      if (!current || current.status === "cancelled") return;
      setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, status: "delivered" } : x)));
      if (o.pointsEarned > 0) adjustPoints(o.pointsEarned, `Order ${o.id}`, o.store);
    }, DELIVERED_MS);
    notify("Order placed!", `Your payment was successful. The kitchen has your order ${o.id}.`);
  }, [adjustPoints, notify]);

  const cancelOrder = useCallback((id: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o)));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      stack, push, pop, replace, popToRoot, resetTo,
      toast, showToast,
      selectedStore, setSelectedStore, orderMode, setOrderMode,
      favorites, toggleFavorite,
      cart,
      cartCount: cart.reduce((s, l) => s + l.quantity, 0),
      cartSubtotal: cart.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
      addLine, changeLineQty, replaceLine, removeLine, removeOneOfProduct, clearCart: () => setCart([]),
      points, bonusPoints, lifetimePoints, pointsTx, adjustPoints,
      orders, addOrder, cancelOrder, notify,
      giftCards, setGiftCards,
      notifications, setNotifications, unreadCount: notifications.filter((n) => !n.read).length,
      savedCards, setSavedCards,
      profile, setProfile, notifPrefs, setNotifPrefs, language, setLanguage,
    }),
    [stack, push, pop, replace, popToRoot, resetTo, toast, showToast, selectedStore, orderMode, favorites, toggleFavorite, cart, addLine, changeLineQty,
      removeOneOfProduct, replaceLine, removeLine, notify, points, bonusPoints, lifetimePoints, pointsTx, adjustPoints, orders, addOrder, cancelOrder, notify,
      giftCards, notifications, savedCards, profile, notifPrefs, language],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
