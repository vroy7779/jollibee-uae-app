import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

// 1 pt = AED 0.05 and VAT 5% — both taken from the copy in the shipped app.
export const POINT_VALUE = 0.05;
export const VAT_RATE = 0.05;
export const EARN_PER_AED = 1;
export const CANCEL_WINDOW_MS = 60_000;
// How long an order stays "open" (token banner showing) if the customer never marks it collected.
export const COLLECT_WINDOW_MS = 30 * 60_000;
// Points are credited later by the loyalty backend. The prototype stands in for that with a short delay.
const POINTS_CREDIT_MS = 150_000;

export const aed = (n: number) => `AED ${n.toFixed(2)}`;
export const fmtDateTime = (ts: number) =>
  new Date(ts).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Checkout works in two steps: coupons reduce the order total, then Joy Points, the Money Wallet
// and a card pay what is left, in any combination.
export const CHECKOUT_RULES = {
  // Share of the amount due that Joy Points may cover (1 = the whole order).
  maxPointsShare: 1,
};

export type ScreenName =
  | "stores" | "item" | "cart"
  | "checkout" | "payment" | "paymentWebView" | "paymentSuccess"
  | "orderHistory" | "orderDetail"
  | "wallet" | "pointsHistory" | "tierBenefits" | "tierJourney" | "coupons"
  | "giftCards" | "myGiftCards" | "createGiftCard" | "giftCardDetail"
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

// No step-by-step tracking for now: a QSR order is ready within minutes, and the store's POS (Aloha)
// does not send status updates yet. An order is simply open, completed or cancelled.
export type OrderStatus = "placed" | "completed" | "cancelled";
export type OrderMode = "dine-in" | "take-away";

export interface Order {
  id: string;
  /** Number the store calls out at the counter. Issued by the store with the order. */
  token: number;
  pointsCredited: boolean;
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
  walletUsed: number;
  cardCharged: number;
  paidWith: string;
  pointsEarned: number;
  status: OrderStatus;
}

/** An order whose token the customer still needs: placed, not cancelled, not collected, and recent. */
export const isOpenOrder = (o: Order, at = Date.now()) => o.status === "placed" && at - o.placedAt < COLLECT_WINDOW_MS;

export const orderState = (o: Order): "open" | "completed" | "cancelled" =>
  o.status === "cancelled" ? "cancelled" : isOpenOrder(o) ? "open" : "completed";

export type GiftCardStatus = "active" | "loaded" | "sent" | "expired";
export type GiftCardTxKind = "purchased" | "received" | "sent" | "loaded";

// A gift card belongs to an account. There is no card number or PIN to type: a card bought for
// someone lands in their account, and a card someone sends you shows up in yours.
export interface GiftCard {
  id: string;
  /** Short reference to quote to support. Not a secret and not used to redeem. */
  ref: string;
  amount: number;
  balance: number;
  status: GiftCardStatus;
  expires: number;
  design?: string;
  /** Who sent it, on a card received from someone else. */
  from?: string;
  /** Who it went to, and the mobile number or email of their account, on a card you sent. */
  recipient?: string;
  recipientContact?: string;
  message?: string;
  tx: { kind: GiftCardTxKind; label: string; amount: number; date: number }[];
}

export interface PointsTx {
  id: string;
  label: string;
  sub: string;
  pts: number;
  date: number;
  kind: "earned" | "redeemed" | "bonus" | "held";
}

export interface WalletTx { id: string; label: string; amount: number; date: number }
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

  /** Code of the coupon the customer has chosen, from the Coupons screen or at checkout. */
  savedCoupon: string | null;
  setSavedCoupon: (code: string | null) => void;

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

  /** Money Wallet: an AED balance, topped up by loading gift cards. Separate from Joy Points. */
  moneyWallet: number;
  walletTx: WalletTx[];
  adjustWallet: (delta: number, label: string) => void;

  orders: Order[];
  addOrder: (o: Order) => void;
  notify: (title: string, body: string) => void;
  cancelOrder: (id: string) => void;
  /** The customer has collected the order: the token is no longer needed. */
  completeOrder: (id: string) => void;

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
    id: "JB-10482", token: 31, pointsCredited: true, ref: "NI-7F3A91C2", placedAt: now - 3 * DAY, store: "Dubai Mall - 124th shop", mode: "dine-in",
    lines: seedLines, subtotal: 51, discount: 0, vat: 2.55, total: 53.55, pointsRedeemed: 0, walletUsed: 0,
    cardCharged: 53.55, paidWith: "Visa ending 4242", pointsEarned: 53, status: "completed",
  },
  {
    id: "JB-10311", token: 18, pointsCredited: true, ref: "NI-2B88D0E4", placedAt: now - 12 * DAY, store: "Marina Mall - Shop 45", mode: "take-away",
    lines: [seedLines[1]], subtotal: 15, discount: 0, vat: 0.75, total: 15.75, pointsRedeemed: 100, walletUsed: 0,
    cardCharged: 10.75, paidWith: "Visa ending 4242", pointsEarned: 10, status: "completed",
  },
];

const seedGiftCards: GiftCard[] = [
  {
    id: "gc1", ref: "GC-3456", amount: 100, balance: 100, status: "active", expires: now + 300 * DAY, design: "treat-1",
    tx: [{ kind: "purchased", label: "Purchased", amount: 100, date: now - 5 * DAY }],
  },
  {
    id: "gc2", ref: "GC-7654", amount: 50, balance: 50, status: "active", expires: now + 340 * DAY, design: "bday-1",
    from: "Maria Santos", message: "Happy birthday! Enjoy a treat on me 🎂",
    tx: [{ kind: "received", label: "Received from Maria Santos", amount: 50, date: now - 2 * DAY }],
  },
  {
    id: "gc3", ref: "GC-2222", amount: 20, balance: 0, status: "loaded", expires: now + 200 * DAY, design: "thanks-1",
    from: "Ahmed K.", message: "Thank you for everything — enjoy!",
    tx: [
      { kind: "loaded", label: "Loaded to Money Wallet", amount: 20, date: now - 9 * DAY },
      { kind: "received", label: "Received from Ahmed K.", amount: 20, date: now - 12 * DAY },
    ],
  },
  {
    id: "gc4", ref: "GC-8810", amount: 50, balance: 50, status: "sent", expires: now + 320 * DAY, design: "congrats-1",
    recipient: "Ana Reyes", recipientContact: "+971 55 234 5678", message: "Congratulations! This one's on me 🎉",
    tx: [
      { kind: "sent", label: "Sent to Ana Reyes", amount: 50, date: now - 20 * DAY },
      { kind: "purchased", label: "Purchased", amount: 50, date: now - 20 * DAY },
    ],
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
  const [savedCoupon, setSavedCoupon] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<number[]>([1, 8]);
  const toggleFavorite = useCallback(
    (id: number) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
    [],
  );
  const [points, setPoints] = useState(480);
  const [bonusPoints] = useState(60);
  const [lifetimePoints, setLifetimePoints] = useState(1820);
  const [pointsTx, setPointsTx] = useState<PointsTx[]>(seedPointsTx);
  const [moneyWallet, setMoneyWallet] = useState(20);
  const [walletTx, setWalletTx] = useState<WalletTx[]>([{ id: "w1", label: "Gift card loaded", amount: 20, date: now - 9 * DAY }]);
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

  const adjustWallet = useCallback((delta: number, label: string) => {
    setMoneyWallet((b) => Math.max(0, Math.round((b + delta) * 100) / 100));
    setWalletTx((t) => [{ id: uid("wt"), label, amount: delta, date: Date.now() }, ...t]);
  }, []);

  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  const addOrder = useCallback((o: Order) => {
    setOrders((prev) => [o, ...prev]);
    // Points are not credited at the till. They arrive later, unless the order was cancelled in the meantime.
    setTimeout(() => {
      const current = ordersRef.current.find((x) => x.id === o.id);
      if (!current || current.status === "cancelled" || o.pointsEarned === 0) return;
      setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, pointsCredited: true } : x)));
      adjustPoints(o.pointsEarned, `Order ${o.id}`, o.store);
      notify("Points credited", `+${o.pointsEarned} pts from order ${o.id} are now in your wallet.`);
    }, POINTS_CREDIT_MS);
    notify("Order placed!", `Token ${o.token} · Order ${o.id}. Collect it when your number is called.`);
  }, [adjustPoints, notify]);

  const completeOrder = useCallback((id: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "completed" } : o)));
  }, []);

  const cancelOrder = useCallback((id: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o)));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      stack, push, pop, replace, popToRoot, resetTo,
      toast, showToast,
      selectedStore, setSelectedStore, orderMode, setOrderMode,
      favorites, toggleFavorite, savedCoupon, setSavedCoupon,
      cart,
      cartCount: cart.reduce((s, l) => s + l.quantity, 0),
      cartSubtotal: cart.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
      addLine, changeLineQty, replaceLine, removeLine, removeOneOfProduct, clearCart: () => setCart([]),
      points, bonusPoints, lifetimePoints, pointsTx, adjustPoints,
      moneyWallet, walletTx, adjustWallet,
      orders, addOrder, cancelOrder, completeOrder, notify,
      giftCards, setGiftCards,
      notifications, setNotifications, unreadCount: notifications.filter((n) => !n.read).length,
      savedCards, setSavedCards,
      profile, setProfile, notifPrefs, setNotifPrefs, language, setLanguage,
    }),
    [stack, push, pop, replace, popToRoot, resetTo, toast, showToast, selectedStore, orderMode, favorites, toggleFavorite, savedCoupon, cart, addLine, changeLineQty,
      removeOneOfProduct, replaceLine, removeLine, notify, points, bonusPoints, lifetimePoints, pointsTx, adjustPoints, moneyWallet, walletTx, adjustWallet, orders, addOrder, cancelOrder, notify,
      giftCards, notifications, savedCards, profile, notifPrefs, language],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
