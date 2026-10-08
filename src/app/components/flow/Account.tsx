import { useEffect, useState } from "react";
import { Bell, ChevronDown, CreditCard, MessageCircle, Phone, Trash2 } from "lucide-react";
import { fmtDate, uid, useApp } from "../../store";
import { Switch } from "../ui/switch";
import { Badge, Button, Card, Choice, Confirm, Empty, Field, IconButton, IconChip, INPUT_CLASS, Link, Row, ScreenShell, Section, Sheet } from "../ds";

/* ---------- Notifications ---------- */

export function NotificationsScreen() {
  const { notifications, setNotifications, unreadCount, push } = useApp();
  return (
    <ScreenShell
      title="Notifications"
      right={unreadCount > 0 && (
        <Link className="px-2" onClick={() => setNotifications((n) => n.map((x) => ({ ...x, read: true })))}>Mark all read</Link>
      )}
    >
      {notifications.length === 0 ? (
        <Empty icon={Bell} title="No notifications yet" body="Order updates and offers will show up here." />
      ) : (
        <div className="p-4">
          <Card>
            {notifications.map((n) => (
              <button
                key={n.id}
                aria-label={`${n.title}${n.read ? ", already read" : ", unread"}`}
                onClick={() => {
                  setNotifications((all) => all.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                  push("notificationDetail", { id: n.id });
                }}
                className={`flex w-full items-start gap-3 border-b border-line p-4 text-left last:border-b-0 ${n.read ? "hover:bg-sunken" : "bg-reward-subtle"}`}
              >
                <span className={`mt-2 h-2 w-2 flex-shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-brand"}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block ${n.read ? "text-ink-2" : "font-semibold text-ink"}`}>{n.title}</span>
                  <span className="block truncate text-sm text-ink-3">{n.body}</span>
                  <span className="mt-1 block text-xs text-ink-3">{fmtDate(n.date)}</span>
                </span>
              </button>
            ))}
          </Card>
        </div>
      )}
    </ScreenShell>
  );
}

export function NotificationDetailScreen({ params }: { params: { id: string } }) {
  const { notifications } = useApp();
  const n = notifications.find((x) => x.id === params.id);
  return (
    <ScreenShell title="Notification">
      <div className="p-4">
        <Card className="p-4">
          <p className="text-xs text-ink-3">{n && fmtDate(n.date)}</p>
          <p className="t-h2 mt-1">{n?.title ?? "Notification"}</p>
          <p className="mt-3 text-ink-2">{n?.body}</p>
        </Card>
      </div>
    </ScreenShell>
  );
}

/* ---------- Personal info ---------- */

export const NATIONALITIES = ["United Arab Emirates", "Philippines", "India", "Saudi Arabia", "United Kingdom", "United States"];

export function PersonalInfoScreen() {
  const { profile, setProfile, showToast, pop } = useApp();
  const [form, setForm] = useState(profile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [natOpen, setNatOpen] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = () => {
    const errs: Record<string, string> = {};
    const digits = form.phone.replace(/\D/g, "");
    if (!form.firstName.trim()) errs.firstName = "Enter your first name";
    if (!form.lastName.trim()) errs.lastName = "Enter your last name";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Enter a valid email";
    if (digits.length < 9) errs.phone = `Mobile number is too short (${digits.length} of 9 digits)`;
    else if (digits.length > 9) errs.phone = `Mobile number is too long (${digits.length} of 9 digits)`;
    else if (digits[0] !== "5") errs.phone = "UAE mobile starts with 5 (e.g. 50 123 4567)";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setProfile(form);
    showToast("Your details have been updated.");
    pop();
  };

  return (
    <ScreenShell title="Personal Info" footer={<Button onClick={save}>Save changes</Button>}>
      <Section title="ABOUT YOU">
        <Card className="space-y-3 p-4">
          <Field label="First name" value={form.firstName} error={errors.firstName} onChange={set("firstName")} />
          <Field label="Last name" value={form.lastName} error={errors.lastName} onChange={set("lastName")} />
          <Field label="Date of birth" type="date" value={form.dob} onChange={set("dob")} />
          <div>
            <span className="mb-1 block text-sm font-medium text-ink-2">Nationality</span>
            <button onClick={() => setNatOpen(true)} aria-label="Select nationality" className={`${INPUT_CLASS} flex items-center justify-between border-line-strong text-left`}>
              {form.nationality || "Select your nationality"} <ChevronDown className="h-4 w-4 text-ink-3" />
            </button>
          </div>
        </Card>
      </Section>
      <Section title="CONTACT">
        <Card className="space-y-3 p-4">
          <Field label="Email address" type="email" value={form.email} error={errors.email} onChange={set("email")} />
          <Field label="Phone number" inputMode="tel" value={form.phone} error={errors.phone} hint="+971" onChange={set("phone")} />
          <Field label="Home address" placeholder="Building, street, area" value={form.address} onChange={set("address")} />
        </Card>
        <div className="h-6" />
      </Section>
      <Sheet open={natOpen} onClose={() => setNatOpen(false)} title="Select nationality">
        {NATIONALITIES.map((n) => (
          <Choice key={n} shape="radio" on={form.nationality === n} label={n} onClick={() => { setForm((f) => ({ ...f, nationality: n })); setNatOpen(false); }} />
        ))}
      </Sheet>
    </ScreenShell>
  );
}

/* ---------- Notification settings ---------- */

export function NotificationSettingsScreen() {
  const { notifPrefs, setNotifPrefs } = useApp();
  const items: { key: keyof typeof notifPrefs; title: string; sub: string }[] = [
    { key: "push", title: "Push notifications", sub: "Order updates, promos, and rewards" },
    { key: "inApp", title: "In-app alerts", sub: "Order updates and offers will show up here." },
    { key: "promos", title: "Promotions", sub: "Limited-time offers and deals" },
    { key: "email", title: "Email", sub: "Receipts and weekly digest" },
  ];
  return (
    <ScreenShell title="Notifications">
      <div className="p-4">
        <Card>
          {items.map((i) => (
            <label key={i.key} className="flex items-center gap-3 border-b border-line p-4 last:border-b-0">
              <span className="flex-1">
                <span className="block">{i.title}</span>
                <span className="block text-sm text-ink-3">{i.sub}</span>
              </span>
              <Switch checked={notifPrefs[i.key]} onCheckedChange={(v) => setNotifPrefs((p) => ({ ...p, [i.key]: v }))} aria-label={i.title} />
            </label>
          ))}
        </Card>
        <p className="mt-3 text-xs text-ink-3">
          You'll continue to receive transactional messages required by law (e.g., OTP, payment receipts) regardless of these settings.
        </p>
      </div>
    </ScreenShell>
  );
}

/* ---------- Language ---------- */

const LANGS = [
  { code: "EN", name: "English" },
  { code: "AR", name: "العربية" },
  { code: "TL", name: "Tagalog" },
];

export function LanguageScreen() {
  const { language, setLanguage, showToast } = useApp();
  const [pending, setPending] = useState<string | null>(null);
  const toArabic = pending === "العربية";

  return (
    <ScreenShell title="Language">
      <Section title="Available languages">
        <Card role="radiogroup" aria-label="Language">
          {LANGS.map((l) => (
            <Choice key={l.code} shape="radio" on={language === l.name} label={l.name} onClick={() => l.name !== language && setPending(l.name)} />
          ))}
        </Card>
      </Section>
      <Confirm
        open={pending !== null} title="Restart required"
        message={toArabic
          ? "Switching to Arabic changes the layout to right-to-left. The app needs to restart to apply it. Restart now?"
          : "The app needs to restart to apply the new language. Restart now?"}
        confirmLabel="Restart now" cancelLabel="Not now"
        onCancel={() => setPending(null)}
        onConfirm={() => { setLanguage(pending!); setPending(null); showToast("Language updated"); }}
      />
    </ScreenShell>
  );
}

/* ---------- Payment methods ---------- */

export function PaymentMethodsScreen() {
  const { savedCards, setSavedCards, showToast } = useApp();
  const [remove, setRemove] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [num, setNum] = useState("");
  const [exp, setExp] = useState("");
  const target = savedCards.find((c) => c.id === remove);

  const digits = num.replace(/\D/g, "");
  const addCard = () => {
    const brand = digits[0] === "4" ? "Visa" : digits[0] === "3" ? "American Express" : "Mastercard";
    setSavedCards((c) => [...c, { id: uid("card"), brand, last4: digits.slice(-4), expires: exp, isDefault: c.length === 0 }]);
    setAddOpen(false);
    setNum("");
    setExp("");
    showToast("Card added");
  };

  return (
    <ScreenShell title="Payment Methods" footer={<Button onClick={() => setAddOpen(true)}>Add new card</Button>}>
      {savedCards.length === 0 ? (
        <Empty icon={CreditCard} title="No saved cards" body="Cards you add at checkout will be saved here for next time." />
      ) : (
        <Section title="YOUR CARDS">
          <Card>
            {savedCards.map((c) => (
              <div key={c.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <IconChip icon={CreditCard} tint={c.isDefault ? "brand" : "neutral"} />
                <div className="min-w-0 flex-1">
                  <p>{c.brand} ending {c.last4}</p>
                  <p className="text-sm text-ink-3">Expires {c.expires}</p>
                </div>
                {c.isDefault ? (
                  <Badge tone="success">Default</Badge>
                ) : (
                  <Link onClick={() => setSavedCards((all) => all.map((x) => ({ ...x, isDefault: x.id === c.id })))} aria-label={`Make ${c.brand} ending ${c.last4} the default`}>Make default</Link>
                )}
                <IconButton icon={Trash2} label={`Remove ${c.brand} ending ${c.last4}`} onClick={() => setRemove(c.id)} className="-mr-2 text-ink-2" />
              </div>
            ))}
          </Card>
        </Section>
      )}
      <p className="px-4 py-4 text-xs text-ink-3">
        Payments are processed securely by Network International (UAE). Your card details never touch our servers.
      </p>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add new card">
        <div className="space-y-3">
          <Field label="Card number" inputMode="numeric" placeholder="4242 4242 4242 4242" value={digits.replace(/(\d{4})(?=\d)/g, "$1 ")} onChange={(e) => setNum(e.target.value.replace(/\D/g, "").slice(0, 16))} />
          <Field label="Expiry" placeholder="MM/YY" value={exp} maxLength={5} onChange={(e) => setExp(e.target.value.replace(/[^\d/]/g, ""))} />
          <p className="text-xs text-ink-3">Prototype only — don't enter a real card. The live app hands this step to Network International.</p>
          <Button disabled={digits.length < 15 || !/^\d{2}\/\d{2}$/.test(exp)} onClick={addCard}>Add card</Button>
        </div>
      </Sheet>

      <Confirm
        open={!!target} title={`Remove ${target ? `${target.brand} ending ${target.last4}` : ""}?`}
        message="You can add it again at checkout." confirmLabel="Remove" cancelLabel="Keep it"
        onCancel={() => setRemove(null)}
        onConfirm={() => { setSavedCards((all) => all.filter((x) => x.id !== remove)); setRemove(null); }}
      />
    </ScreenShell>
  );
}

/* ---------- Help & support ---------- */

const FAQ = [
  { q: "How do I redeem my Joy Points?", a: "At checkout, expand Offers & Payment and choose how many Joy Points to use. 1 pt = AED 0.05, and you can combine points with a promo code or gift card." },
  { q: "Can I cancel an order?", a: "Orders can be cancelled within 60 seconds of placement. After that, please call the store directly via the Stores screen." },
  { q: "Why was my card declined?", a: "Payments are processed securely by Network International (UAE). A decline usually comes from your bank — try a different method or contact your bank." },
  { q: "How do I change my phone number?", a: "Personal Info screen lets you edit your phone. We will send an OTP to the new number to verify before the change takes effect." },
  { q: "When are my points credited?", a: "Points aren't added instantly. They're credited to your wallet a short period after your order. For in-store purchases, scan the QR code on your receipt." },
];

export function HelpSupportScreen() {
  const { showToast } = useApp();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ScreenShell title="Help & Support">
      <Section title="CONTACT">
        <Card>
          <Row icon={Phone} tint="success" label="Call us" sub="+971 800 555 333 · 9am – 11pm daily" onClick={() => { window.location.href = "tel:+971800555333"; }} />
          <Row icon={MessageCircle} tint="accent" label="Live chat" sub="Average reply: 3 minutes" onClick={() => showToast("Coming soon")} />
        </Card>
      </Section>
      <Section title="FREQUENTLY ASKED">
        <Card>
          {FAQ.map((f, i) => (
            <div key={f.q} className="border-b border-line last:border-b-0">
              <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left hover:bg-sunken">
                <span className="flex-1">{f.q}</span>
                <ChevronDown className={`h-4 w-4 text-ink-3 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <p className="px-4 pb-4 text-sm text-ink-2">{f.a}</p>}
            </div>
          ))}
        </Card>
        <p className="py-4 text-xs text-ink-3">App version 1.0.7</p>
      </Section>
    </ScreenShell>
  );
}

/* ---------- Account deletion ---------- */

export function AccountDeletionScreen({ onDeleted }: { onDeleted: () => void }) {
  const { profile, showToast } = useApp();
  const [step, setStep] = useState<"intro" | "code">("intro");
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const send = () => {
    setStep("code");
    setSeconds(30);
    showToast(`We've sent a verification code to ${profile.email}.`);
  };

  return (
    <ScreenShell title="Delete Account">
      <div className="space-y-4 p-4">
        <Card className="bg-error-subtle p-4">
          <p className="font-semibold text-error">This action is permanent</p>
          <p className="mt-1 text-sm text-ink-2">Deleting your account will remove all your data. You won't be able to recover it.</p>
        </Card>

        <div>
          <p className="t-label mb-2 text-ink-3">What you'll lose</p>
          <Card>
            <Row label="Your Jolli Club points and current tier" />
            <Row label="Order history and receipts" />
            <Row label="Any unused coupons or rewards" />
            <Row label="Saved addresses and payment methods" />
          </Card>
        </div>

        {step === "intro" ? (
          <>
            <p className="text-sm text-ink-2">To continue, we'll email a 6-digit verification code to {profile.email}.</p>
            <Button onClick={send}>Send verification code</Button>
          </>
        ) : (
          <>
            <Field label="Verification code" placeholder="6-digit code" inputMode="numeric" maxLength={6} value={code} hint="Mock OTP: use any 6 digits" onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            <Link disabled={seconds > 0} onClick={send}>{seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}</Link>
            <Button variant="danger" disabled={code.length < 6} onClick={() => setConfirm(true)}>Delete my account</Button>
          </>
        )}
      </div>
      <Confirm
        open={confirm} title="Delete account?" message="Deleting your account will remove all your data. You won't be able to recover it."
        confirmLabel="Delete" cancelLabel="Keep it"
        onCancel={() => setConfirm(false)}
        onConfirm={() => { setConfirm(false); showToast("Your account has been deleted."); onDeleted(); }}
      />
    </ScreenShell>
  );
}
