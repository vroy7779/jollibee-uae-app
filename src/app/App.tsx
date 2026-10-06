import { useEffect, useRef, useState } from "react";
import { Home, ShoppingBag, Trophy, QrCode, ChevronRight, X } from "lucide-react";
import { LoginScreen } from "./components/LoginScreen";
import { HomeScreen } from "./components/HomeScreen";
import { OrderScreen } from "./components/OrderScreen";
import { JolliClubScreen, type Reward } from "./components/JolliClubScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { ScanScreen } from "./components/ScanScreen";
import { StoresScreen } from "./components/StoresScreen";
import qrCodeImage from "figma:asset/97dd81fe8cc84d302f898bf2918ce0676cff190f.png";
import { AppProvider, aed, liveStatus, useApp, type Order, type OrderStatus, type ScreenName } from "./store";
import { Button, Confirm, Sheet, Toast } from "./components/ds";
import { ItemDetailScreen } from "./components/flow/ItemDetail";
import { CartScreen } from "./components/flow/Cart";
import { CheckoutScreen, PaymentScreen, PaymentSuccessScreen, PaymentWebViewScreen } from "./components/flow/OrderFlow";
import { OrderDetailScreen, OrderHistoryScreen } from "./components/flow/Orders";
import { CouponsScreen, PointsHistoryScreen, TierBenefitsScreen, TierJourneyScreen, WalletScreen } from "./components/flow/Loyalty";
import { AddGiftCardScreen, CreateGiftCardScreen, GiftCardDetailScreen, GiftCardsScreen, MyGiftCardsScreen } from "./components/flow/GiftCards";
import {
  AccountDeletionScreen, HelpSupportScreen, LanguageScreen, NotificationDetailScreen, NotificationSettingsScreen,
  NotificationsScreen, PaymentMethodsScreen, PersonalInfoScreen,
} from "./components/flow/Account";
import { ReceiptScanScreen } from "./components/flow/ReceiptScan";
import { OnboardingScreen, SignupScreen } from "./components/flow/Auth";

type TabType = "home" | "order" | "rewards" | "scan" | "stores";
type AuthStage = "login" | "signup" | "onboarding" | "app";

const tabs = [
  { id: "home" as TabType, label: "Home", icon: Home },
  { id: "order" as TabType, label: "Order", icon: ShoppingBag },
  { id: "rewards" as TabType, label: "Jolli Club", icon: Trophy },
  { id: "scan" as TabType, label: "Scan", icon: QrCode },
];

const STATUS_COPY: Record<OrderStatus, { title: string; sub: (o: Order) => string; tone: string }> = {
  placed: { title: "Order placed", sub: (o) => `We've sent it to ${o.store}`, tone: "bg-reward-subtle text-ink" },
  preparing: { title: "Your order is being prepared", sub: (o) => `The kitchen at ${o.store} is on it`, tone: "bg-reward text-ink" },
  ready: { title: "Your order is ready!", sub: (o) => (o.mode === "dine-in" ? "We're bringing it to your table" : `Collect it at the counter · ${o.store}`), tone: "bg-success text-white" },
  delivered: { title: "Enjoy your meal!", sub: (o) => (o.pointsEarned > 0 ? `+${o.pointsEarned} pts added to your wallet` : "Order complete"), tone: "bg-ink text-white" },
  cancelled: { title: "Order Cancelled", sub: () => "", tone: "bg-ink text-white" },
};
// Dev-only deep links for design review, e.g. /?tab=order&store=1&cart=1 or /?screen=wallet.
// Stripped from production builds.
const preview = import.meta.env.DEV ? new URLSearchParams(window.location.search) : new URLSearchParams();
const previewing = preview.has("tab") || preview.has("screen");

const STEPS: OrderStatus[] = ["placed", "preparing", "ready", "delivered"];

// Stores sit in the same stack as every other pushed screen so cart and checkout can open them too.
function StoresRoute({ onPicked }: { onPicked: () => void }) {
  const { selectedStore, setSelectedStore, cartCount, clearCart, pop } = useApp();
  const [pending, setPending] = useState<string | null>(null);

  const choose = (store: string) => {
    if (cartCount > 0 && selectedStore && store !== selectedStore) return setPending(store);
    setSelectedStore(store);
    onPicked();
  };

  return (
    <div className="anim-screen absolute inset-0 z-[60] bg-bg">
      <StoresScreen onClose={pop} onSelectStore={choose} />
      <Confirm
        open={pending !== null} title="Discard cart?"
        message="Your cart was built for a different store. Changing store removes all items from your order."
        confirmLabel="Change store" cancelLabel="Keep it"
        onCancel={() => setPending(null)}
        onConfirm={() => { clearCart(); setSelectedStore(pending!); setPending(null); onPicked(); }}
      />
    </div>
  );
}

function Shell({ onSignOut }: { onSignOut: () => void }) {
  const app = useApp();
  const { stack, cartCount, cartSubtotal, orders, popToRoot, adjustPoints, points } = app;

  const [auth, setAuth] = useState<AuthStage>(previewing ? "app" : (preview.get("auth") as AuthStage) ?? "login");
  const [activeTab, setActiveTab] = useState<TabType>((preview.get("tab") as TabType) ?? "home");
  const [showProfile, setShowProfile] = useState(preview.get("tab") === "profile");

  useEffect(() => {
    if (!previewing) return;
    if (preview.has("store")) app.setSelectedStore("Dubai Mall - 124th shop");
    if (preview.has("cart")) {
      app.addLine({ productId: 1, name: "2-Piece Chickenjoy", unitPrice: 23, img: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400", quantity: 1, mods: ["Spicy", "Regular Fries"] });
      app.addLine({ productId: 8, name: "Jolly Spaghetti", unitPrice: 15, img: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400", quantity: 2, mods: [] });
    }
    const screen = preview.get("screen") as ScreenName | null;
    if (screen) app.push(screen, { productId: Number(preview.get("productId") ?? 1), id: preview.get("id") ?? "gc1", orderId: preview.get("orderId") ?? "JB-10482", design: preview.get("design") ?? undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [nudge, setNudge] = useState<{ orderId: string; status: OrderStatus } | null>(null);
  const [, setClock] = useState(0);
  const [redeem, setRedeem] = useState<Reward | null>(null);
  const [redeemed, setRedeemed] = useState(false);

  const top = stack[stack.length - 1];

  // Watch every open order and raise an on-screen nudge the moment its status moves on.
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const seenStatus = useRef<Record<string, OrderStatus>>({});
  const { notify } = app;
  useEffect(() => {
    const check = () => {
      let anyOpen = false;
      for (const o of ordersRef.current) {
        const st = liveStatus(o);
        const prev = seenStatus.current[o.id];
        seenStatus.current[o.id] = st;
        if (st !== "delivered" && st !== "cancelled") anyOpen = true;
        if (prev && prev !== st && st !== "cancelled") {
          setNudge({ orderId: o.id, status: st });
          notify(STATUS_COPY[st].title, `Order ${o.id} · ${STATUS_COPY[st].sub(o)}`);
        }
      }
      if (anyOpen) setClock((n) => n + 1);
    };
    check();
    const t = setInterval(check, 1000);
    return () => clearInterval(t);
  }, [notify]);

  // "Ready" stays up until the customer acts on it; the other nudges clear themselves.
  useEffect(() => {
    if (!nudge || nudge.status === "ready") return;
    const t = setTimeout(() => setNudge(null), 8000);
    return () => clearTimeout(t);
  }, [nudge]);

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(liveStatus(o)));
  const activeOrder = activeOrders[0];
  const nudgeOrder = nudge && orders.find((o) => o.id === nudge.orderId);

  const handleNavigation = (tab: TabType) => {
    if (tab === "stores") {
      app.push("stores", { goToMenu: true });
    } else {
      setActiveTab(tab);
      setShowProfile(false);
    }
  };

  const goToTab = (tab: TabType) => {
    popToRoot();
    handleNavigation(tab);
  };

  // Signing out remounts the provider so no account data survives into the next session.
  const handleLogout = onSignOut;

  const renderOverlay = () => {
    if (!top) return null;
    const p = top.params;
    switch (top.name) {
      case "stores": return <StoresRoute onPicked={() => { app.pop(); if (p?.goToMenu) { setActiveTab("order"); setShowProfile(false); } }} />;
      case "item": return <ItemDetailScreen key={`${p.productId}-${p.lineId ?? "new"}`} params={p} />;
      case "cart": return <CartScreen onBrowseMenu={() => goToTab("order")} />;
      case "checkout": return <CheckoutScreen />;
      case "payment": return <PaymentScreen params={p} />;
      case "paymentWebView": return <PaymentWebViewScreen params={p} />;
      case "paymentSuccess": return <PaymentSuccessScreen params={p} onHome={() => goToTab("home")} />;
      case "orderHistory": return <OrderHistoryScreen onStartOrdering={() => goToTab("order")} />;
      case "orderDetail": return <OrderDetailScreen params={p} onOrderAgain={() => goToTab("order")} />;
      case "wallet": return <WalletScreen onStartOrdering={() => goToTab("order")} />;
      case "pointsHistory": return <PointsHistoryScreen />;
      case "tierBenefits": return <TierBenefitsScreen />;
      case "tierJourney": return <TierJourneyScreen onStartOrdering={() => goToTab("order")} />;
      case "coupons": return <CouponsScreen />;
      case "giftCards": return <GiftCardsScreen />;
      case "myGiftCards": return <MyGiftCardsScreen />;
      case "createGiftCard": return <CreateGiftCardScreen params={p} />;
      case "giftCardDetail": return <GiftCardDetailScreen params={p} />;
      case "addGiftCard": return <AddGiftCardScreen />;
      case "notifications": return <NotificationsScreen />;
      case "notificationDetail": return <NotificationDetailScreen params={p} />;
      case "personalInfo": return <PersonalInfoScreen />;
      case "notificationSettings": return <NotificationSettingsScreen />;
      case "language": return <LanguageScreen />;
      case "paymentMethods": return <PaymentMethodsScreen />;
      case "helpSupport": return <HelpSupportScreen />;
      case "accountDeletion": return <AccountDeletionScreen onDeleted={handleLogout} />;
      case "receiptScan": return <ReceiptScanScreen />;
    }
  };

  const bars = (activeOrder ? 1 : 0) + (cartCount > 0 ? 1 : 0);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Device frame: presentation chrome for the prototype, not part of the app UI */}
      <div className="relative h-[812px] w-full max-w-[375px] rounded-[44px] bg-ink p-3">
        <div className="relative h-full w-full overflow-hidden rounded-[32px] bg-bg">
          {auth === "login" && (
            <div className="h-full overflow-y-auto">
              <LoginScreen onLogin={() => setAuth("app")} onSignup={() => setAuth("signup")} />
            </div>
          )}
          {auth === "signup" && <SignupScreen onDone={() => setAuth("onboarding")} onLogin={() => setAuth("login")} />}
          {auth === "onboarding" && <OnboardingScreen onDone={() => setAuth("app")} onUseDifferentAccount={() => setAuth("login")} />}

          {auth === "app" && (
            <>
              {/* Tabs stay mounted under pushed screens; inert keeps them out of focus and the a11y tree. */}
              <div className="contents" {...(top ? { inert: "" } : {})}>
                <div className={`h-full overflow-y-auto ${showProfile ? "" : ["pb-16", "pb-28", "pb-40"][bars]}`}>
                  {showProfile ? (
                    <div className="anim-screen min-h-full"><ProfileScreen onClose={() => setShowProfile(false)} onLogout={handleLogout} /></div>
                  ) : (
                    <div key={activeTab} className="anim-fade min-h-full">
                      {activeTab === "home" && <HomeScreen onProfileClick={() => setShowProfile(true)} onNavigate={handleNavigation} />}
                      {activeTab === "order" && <OrderScreen onNavigate={handleNavigation} />}
                      {activeTab === "rewards" && (
                        <JolliClubScreen onStartOrdering={() => handleNavigation("order")} onRedeem={(r) => { setRedeemed(false); setRedeem(r); }} />
                      )}
                      {activeTab === "scan" && <ScanScreen onOpenProfile={() => setShowProfile(true)} />}
                    </div>
                  )}
                </div>

                {!showProfile && (
                  <div className="absolute inset-x-0 bottom-0 z-40">
                    {/* Cart: one entry point, same place on every tab */}
                    {cartCount > 0 && (
                      <button
                        onClick={() => app.push("cart")}
                        aria-label={`View cart with ${cartCount} items`}
                        key={cartCount}
                        className="anim-bump flex h-12 w-full items-center gap-3 bg-brand px-4 text-left text-white shadow-float hover:bg-brand-pressed"
                      >
                        <span className="t-num flex h-7 min-w-7 items-center justify-center rounded-full bg-reward px-2 text-sm font-bold text-ink">{cartCount}</span>
                        <span className="t-num flex-1 font-semibold">{aed(cartSubtotal)}</span>
                        <span className="font-bold">View cart</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}

                    {/* Open order: live status, always one tap from tracking */}
                    {activeOrder && (() => {
                      const st = liveStatus(activeOrder);
                      const step = STEPS.indexOf(st);
                      return (
                        <button
                          onClick={() => app.push("orderDetail", { orderId: activeOrder.id })}
                          aria-label={`Track order ${activeOrder.id}: ${STATUS_COPY[st].title}`}
                          key={st}
                          className={`anim-rise flex h-12 w-full items-center gap-3 px-4 text-left ${STATUS_COPY[st].tone}`}
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {STATUS_COPY[st].title}
                            <span className="font-normal opacity-80"> · {activeOrder.id}{activeOrders.length > 1 ? ` +${activeOrders.length - 1}` : ""}</span>
                          </span>
                          <span className="flex gap-1" aria-hidden>
                            {STEPS.map((x, i) => (
                              <span key={x} className={`h-1.5 w-4 rounded-full bg-current ${i <= step ? "" : "opacity-30"}`} />
                            ))}
                          </span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      );
                    })()}

                    <nav aria-label="Main" className="grid h-16 grid-cols-4 border-t border-line bg-surface">
                      {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            aria-current={isActive ? "page" : undefined}
                            className={`flex flex-col items-center justify-center gap-0.5 ${isActive ? "font-bold text-brand-text" : "text-ink-3"}`}
                          >
                            <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 ${isActive ? "bg-brand text-white" : ""}`}>
                              <tab.icon className={`h-5 w-5 ${isActive ? "anim-pop" : ""}`} />
                            </span>
                            <span className="text-xs">{tab.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                )}
              </div>

              {renderOverlay()}

              {/* Status-change nudge: sits above every screen, including pushed ones */}
              {nudge && nudgeOrder && (
                <div role="alert" key={nudge.status} className={`anim-drop absolute inset-x-3 top-3 z-[95] rounded-lg p-4 shadow-float ${STATUS_COPY[nudge.status].tone}`}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{STATUS_COPY[nudge.status].title}</p>
                      <p className="text-sm opacity-90">Order {nudgeOrder.id} · {STATUS_COPY[nudge.status].sub(nudgeOrder)}</p>
                    </div>
                    <button onClick={() => setNudge(null)} aria-label="Dismiss" className="-mr-2 -mt-2 flex h-10 w-10 items-center justify-center rounded-md hover:bg-ink/10">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" size="sm" fit className="!border-transparent !text-ink" onClick={() => { setNudge(null); app.push("orderDetail", { orderId: nudgeOrder.id }); }}>
                      Track order
                    </Button>
                    {nudge.status === "delivered" && nudgeOrder.pointsEarned > 0 && (
                      <Button variant="reward" size="sm" fit onClick={() => { setNudge(null); app.push("wallet"); }}>
                        View Jolli Wallet
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <Sheet open={redeem !== null} onClose={() => setRedeem(null)} title={redeem?.reward}>
                {redeem && !redeemed && (
                  <div className="space-y-4">
                    <p className="text-sm text-ink-2">
                      This uses {redeem.points} of your {points.toLocaleString()} pts.
                    </p>
                    <Button
                      onClick={() => {
                        adjustPoints(-redeem.points, redeem.reward, "Reward redeemed");
                        setRedeemed(true);
                      }}
                    >
                      Redeem · {redeem.points} pts
                    </Button>
                  </div>
                )}
                {redeem && redeemed && (
                  <div>
                    <img src={qrCodeImage} alt="Reward QR code" className="anim-pop mx-auto h-48 w-48 object-contain" />
                    <p className="mt-3 text-center text-sm text-ink-2">Show this QR at the counter on your next visit and staff will scan it.</p>
                  </div>
                )}
              </Sheet>

              <Toast />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(0);
  return (
    <AppProvider key={session}>
      <Shell onSignOut={() => setSession((n) => n + 1)} />
    </AppProvider>
  );
}
