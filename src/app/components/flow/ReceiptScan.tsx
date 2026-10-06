import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";
import { aed, EARN_PER_AED, fmtDate, useApp } from "../../store";
import { Button, Card, CountUp, Divider, Field, Line, ScreenShell, Spinner, SuccessMark } from "../ds";

type Phase = "idle" | "scanning" | "manual" | "validating" | "confirm" | "claiming" | "done" | "error";

interface Receipt { code: string; store: string; date: number; spend: number; points: number }

// Stand-in for the receipt-claim API. Codes starting with these prefixes exercise the error states.
const ERRORS: Record<string, string> = {
  USED: "This receipt has already been used to earn points.",
  OLD: "This receipt is no longer eligible for points.",
  REF: "This purchase was refunded, so it can't earn points.",
  VOID: "This transaction was cancelled, so it can't earn points.",
  NONE: "We couldn't find this purchase. Check the code and try again.",
};

function lookup(code: string): { receipt?: Receipt; error?: string } {
  const key = Object.keys(ERRORS).find((k) => code.toUpperCase().startsWith(k));
  if (key) return { error: ERRORS[key] };
  const spend = 20 + (code.length * 7) % 60;
  return { receipt: { code: code.toUpperCase(), store: "DXB-124", date: Date.now() - 86_400_000, spend, points: Math.floor(spend * EARN_PER_AED) } };
}

export function ReceiptScanScreen() {
  const { adjustPoints, pop } = useApp();
  const [phase, setPhase] = useState<Phase>("idle");
  const [code, setCode] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<string[]>([]);

  const validate = (c: string) => {
    setPhase("validating");
    setTimeout(() => {
      if (claimed.includes(c.toUpperCase())) {
        setError("This purchase is already linked to your account. Your points have been added or are on their way.");
        return setPhase("error");
      }
      const res = lookup(c);
      if (res.error) {
        setError(res.error);
        return setPhase("error");
      }
      setReceipt(res.receipt!);
      setPhase("confirm");
    }, 1300);
  };

  // The camera view is simulated: it "finds" a QR code after a moment.
  useEffect(() => {
    if (phase !== "scanning") return;
    const t = setTimeout(() => validate(`QR${Math.floor(1000 + Math.random() * 9000)}`), 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const claim = () => {
    setPhase("claiming");
    setTimeout(() => {
      adjustPoints(receipt!.points, "Receipt points added", `In-store purchase · ${receipt!.store}`);
      setClaimed((c) => [...c, receipt!.code]);
      setPhase("done");
    }, 1300);
  };

  const reset = () => {
    setCode("");
    setReceipt(null);
    setError(null);
    setPhase("idle");
  };

  return (
    <ScreenShell title="Claim your points">
      {phase === "idle" && (
        <div className="stagger p-4">
          <div className="relative mx-auto mb-4 mt-2 flex h-24 w-24 items-center justify-center">
            <span aria-hidden className="anim-ping absolute inset-2 rounded-full bg-reward" />
            <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-reward text-brand-deep"><ScanLine className="h-10 w-10" /></span>
          </div>
          <h2 className="t-h2 text-center">Scan the QR code on your receipt</h2>
          <p className="mt-1 text-center text-ink-2">We'll add the points from your in-store purchase to your account.</p>
          <div className="mt-5 space-y-2">
            <Button onClick={() => setPhase("scanning")}>Scan receipt QR</Button>
            <Button variant="secondary" onClick={() => setPhase("manual")}>Enter the code manually</Button>
          </div>
          <p className="t-label mb-2 mt-8 text-ink-3">Good to know</p>
          <ul className="space-y-2 rounded-lg bg-reward-subtle p-4 text-sm text-ink-2">
            <li>Orders you place in the app earn points automatically — this is for in-store purchases.</li>
            <li>Each receipt can be used once, on one account.</li>
            <li>Claim it soon — receipts stop being eligible after a while.</li>
          </ul>
        </div>
      )}

      {phase === "scanning" && (
        <div className="flex h-full flex-col bg-ink text-white">
          <div className="flex flex-1 items-center justify-center">
            <div className="relative h-56 w-56 rounded-lg border-2 border-white/80">
              <div className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-reward" />
            </div>
          </div>
          <div className="space-y-3 p-4">
            <p role="status" className="text-center text-sm">Point the camera at the QR code on your receipt</p>
            <Button variant="secondary" onClick={() => setPhase("manual")}>Enter the code manually</Button>
          </div>
        </div>
      )}

      {phase === "manual" && (
        <div className="space-y-4 p-4">
          <Field label="Claim code" hint="Printed on your receipt" placeholder="Enter claim code" value={code} onChange={(e) => setCode(e.target.value.trim())} />
          <div className="space-y-2">
            <Button disabled={code.length < 4} onClick={() => validate(code)}>Find my purchase</Button>
            <Button variant="ghost" onClick={() => setPhase("scanning")}>Scan the QR code instead</Button>
          </div>
        </div>
      )}

      {phase === "validating" && <Spinner label="Checking your receipt" />}
      {phase === "claiming" && <Spinner label="Adding your points" />}

      {phase === "confirm" && receipt && (
        <div className="p-4">
          <h2 className="t-h2">Is this your purchase?</h2>
          <p className="mt-1 text-sm text-ink-2">Check the details before you claim</p>
          <Card className="my-4 p-4">
            <Line label="Order number" value={receipt.code} />
            <Line label="Store code" value={receipt.store} />
            <Line label="Purchase date" value={fmtDate(receipt.date)} />
            <Line label="Eligible spend" value={aed(receipt.spend)} />
            <Divider />
            <div className="flex items-baseline justify-between"><span className="font-semibold">You'll earn up to</span><span className="t-h2 t-num text-brand-text">{receipt.points} pts</span></div>
          </Card>
          <div className="space-y-2">
            <Button onClick={claim}>Claim points</Button>
            <Button variant="ghost" onClick={reset}>Not this one — scan again</Button>
          </div>
        </div>
      )}

      {phase === "done" && receipt && (
        <div className="p-4 pt-10 text-center">
          <span className="inline-block"><SuccessMark /></span>
          <h2 className="t-h1 mt-5">Receipt points added</h2>
          <p className="t-h2 mt-1 text-brand-text">+<CountUp value={receipt.points} /> pts</p>
          <p className="text-ink-2">added to your wallet!</p>
          <div className="mt-6 space-y-2">
            <Button onClick={reset}>Claim another receipt</Button>
            <Button variant="ghost" onClick={pop}>Back to home</Button>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="p-4 pt-8">
          <h2 className="t-h2">We couldn't claim this receipt</h2>
          <p role="alert" className="mt-1 text-ink-2">{error}</p>
          <div className="mt-6 space-y-2">
            <Button onClick={reset}>Try again</Button>
            <Button variant="ghost" onClick={() => { setError(null); setPhase("manual"); }}>Enter the code manually</Button>
          </div>
        </div>
      )}
    </ScreenShell>
  );
}
