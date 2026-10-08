import { useEffect, useState } from "react";
import { Home, ShoppingBag, Trophy, QrCode, ChevronRight } from "lucide-react";
import { LoginScreen } from "./components/LoginScreen";
import { HomeScreen } from "./components/HomeScreen";
import { OrderScreen } from "./components/OrderScreen";
import { JolliClubScreen, type Reward } from "./components/JolliClubScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { ScanScreen } from "./components/ScanScreen";
import { StoresScreen } from "./components/StoresScreen";
import qrCodeImage from "figma:asset/97dd81fe8cc84d302f898bf2918ce0676cff190f.png";
import { AppProvider, aed, isOpenOrder, useApp, type Order, type Screen, type ScreenName } from "./store";
import { Button, Confirm, Sheet, Toast } from "./components/ds";
import { ItemDetailScreen } from "./components/flow/ItemDetail";
import { CartScreen } from "./components/flow/Cart";
import { CheckoutScreen, PaymentScreen, PaymentSuccessScreen, PaymentWebViewScreen } from "./components/flow/OrderFlow";
import { OrderDetailScreen, OrderHistoryScreen } from "./components/flow/Orders";
import { CouponsScreen, PointsHistoryScreen, TierBenefitsScreen, TierJourneyScreen, WalletScreen } from "./components/flow/Loyalty";
import { CreateGiftCardScreen, GiftCardDetailScreen, GiftCardsScreen, MyGiftCardsScreen } from "./components/flow/GiftCards";
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

// Dev-only deep links for design review, e.g. /?tab=order&store=1&cart=1 or /?screen=wallet.
// Stripped from production builds.
const preview = import.meta.env.DEV ? new URLSearchParams(window.location.search) : new URLSearchParams();
const previewing = preview.has("tab") || preview.has("screen");

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
    const sample: Order = {
      id: "JB-10777", token: 47, pointsCredited: false, ref: "NI-PREVIEW1", placedAt: Date.now(), store: "Dubai Mall - 124th shop", mode: "dine-in",
      lines: [{ lineId: "p1", productId: 1, name: "2-Piece Chickenjoy", unitPrice: 23, img: "", quantity: 1, mods: ["Spicy"] }],
      subtotal: 53, discount: 0, vat: 2.65, total: 55.65, pointsRedeemed: 200, walletUsed: 20, cardCharged: 25.65, paidWith: "", pointsEarned: 25, status: "placed",
    };
    if (preview.has("order")) app.addOrder({ ...sample, paidWith: "Apple Pay" });
    if (screen === "payment") return app.push("payment", { draft: sample, sheet: preview.get("sheet") ?? undefined });
    if (screen) app.push(screen, { productId: Number(preview.get("productId") ?? 1), id: preview.get("id") ?? "gc2", orderId: preview.get("orderId") ?? "JB-10482", design: preview.get("design") ?? undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [, setClock] = useState(0);
  const [redeem, setRedeem] = useState<Reward | null>(null);
  const [redeemed, setRedeemed] = useState(false);

  const top = stack[stack.length - 1];

  // Open orders age out on their own, so re-check them now and then while any exist.
  const openOrders = orders.filter((o) => isOpenOrder(o));
  const openOrder = openOrders[0];
  useEffect(() => {
    if (openOrders.length === 0) return;
    const t = setInterval(() => setClock((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [openOrders.length]);

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

  // The item sheet is a drawer: it sits on top of whichever screen opened it, so that screen keeps rendering underneath.
  const drawer = top?.name === "item" ? top : null;
  const base = drawer ? stack[stack.length - 2] : top;

  const renderScreen = (screen: Screen | undefined) => {
    if (!screen) return null;
    const p = screen.params;
    switch (screen.name) {
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

  const bars = (openOrder ? 1 : 0) + (cartCount > 0 ? 1 : 0);

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
                <div className={`h-full overflow-y-auto ${showProfile ? "" : ["pb-16", "pb-32", "pb-44"][bars]}`}>
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

                    {/* Token banner: the number to listen for stays on screen until the order is collected */}
                    {openOrder && (
                      <button
                        onClick={() => app.push("orderDetail", { orderId: openOrder.id })}
                        aria-label={`Token ${openOrder.token}, order ${openOrder.id}. View order`}
                        className="anim-rise flex h-14 w-full items-center gap-3 bg-reward px-4 text-left text-ink"
                      >
                        <span className="t-num flex h-10 min-w-12 items-center justify-center rounded-md bg-ink px-2 text-xl font-bold text-reward">{openOrder.token}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold">Your token number</span>
                          <span className="block truncate text-xs">
                            Order {openOrder.id}{openOrders.length > 1 ? ` · +${openOrders.length - 1} more` : ""} · collect when called
                          </span>
                        </span>
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    )}

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

              <div className="contents" {...(drawer ? { inert: "" } : {})}>{renderScreen(base)}</div>
              {drawer && renderScreen(drawer)}

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
