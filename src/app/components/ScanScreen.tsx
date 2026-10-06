import { CreditCard, Drumstick, ReceiptText, Settings, Wallet } from "lucide-react";
import qrCodeImage from "figma:asset/97dd81fe8cc84d302f898bf2918ce0676cff190f.png";
import { aed, fmtDate, POINT_VALUE, REWARD_GOAL, useApp } from "../store";
import { Button, Card, CountUp, HeaderGlow, Row } from "./ds";

export function ScanScreen({ onOpenProfile }: { onOpenProfile?: () => void }) {
  const { points, profile, push } = useApp();
  const stats = [
    { icon: Wallet, value: <CountUp value={points} />, label: "total points" },
    { icon: CreditCard, value: aed(points * POINT_VALUE), label: "at checkout" },
    { icon: Drumstick, value: Math.floor(points / REWARD_GOAL.points), label: `free ${REWARD_GOAL.name}` },
  ];

  return (
    <div className="min-h-full bg-bg pb-6">
      <header className="flex min-h-14 items-center bg-brand px-2 pb-1 pt-6 text-white">
        <span className="w-10" />
        <h1 className="t-h3 flex-1 text-center uppercase tracking-wide">Jolli Wallet</h1>
        <button onClick={onOpenProfile} aria-label="Settings" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/15"><Settings className="h-5 w-5" /></button>
      </header>

      <div className="stagger space-y-4 px-4 pt-4">
        {/* Member card */}
        <div className="relative overflow-hidden rounded-lg bg-brand-gradient p-5 text-white shadow-float">
          <HeaderGlow />
          <div className="relative">
            <p className="t-label text-reward">Jolli Club Member</p>
            <p className="t-h1 mt-6">{profile.firstName} {profile.lastName}</p>
            <p className="text-sm">Member since {fmtDate(profile.memberSince)}</p>
          </div>
        </div>

        <button onClick={() => push("wallet")} aria-label="Open wallet details" className="grid w-full grid-cols-3 gap-2 text-center">
          {stats.map((st) => (
            <span key={st.label} className="flex flex-col items-center">
              <st.icon className="h-7 w-7 text-brand-text" />
              <span className="t-num mt-1 font-bold">{st.value}</span>
              <span className="text-xs font-semibold text-ink-2">{st.label}</span>
            </span>
          ))}
        </button>

        <Card className="p-4">
          <img src={qrCodeImage} alt="Your Jolli Club member QR code" className="mx-auto aspect-square w-full max-w-52 object-contain" />
          <p className="mt-2 text-center text-xs text-ink-3">Show this QR code at the counter before payment</p>
          <p className="text-center text-xs text-ink-3">1 pt = AED 0.05 · {REWARD_GOAL.points} pts = 1 free {REWARD_GOAL.name}</p>
        </Card>

        <Button onClick={() => push("myGiftCards")}>Load gift card to wallet</Button>

        <Card className="bg-reward-subtle">
          <Row icon={ReceiptText} tint="reward" label="Got a receipt?" sub="Scan the QR code on your receipt to claim your points" onClick={() => push("receiptScan")} />
        </Card>
      </div>
    </div>
  );
}
