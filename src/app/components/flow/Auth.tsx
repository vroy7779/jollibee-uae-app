import { useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { useApp } from "../../store";
import { NATIONALITIES } from "./Account";
import { Button, Card, Choice, Field, IconButton, INPUT_CLASS, Link, Mark, Sheet, TopBar } from "../ds";

// Placeholder legal copy: the shipped app carries its own terms and privacy text.
const LEGAL = {
  terms: "These terms cover your use of the Jollibee UAE app, Jolli Club membership, Joy Points and gift cards. Points have no cash value outside the app and may expire.",
  privacy: "We use your details to run your account, process orders and send the notifications you choose. Payments are processed securely by Network International (UAE).",
};

export function SignupScreen({ onDone, onLogin }: { onDone: () => void; onLogin: () => void }) {
  const { setProfile } = useApp();
  const [f, setF] = useState({ firstName: "", lastName: "", username: "", email: "", phone: "", password: "" });
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [legal, setLegal] = useState<"terms" | "privacy" | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = () => {
    const e: Record<string, string> = {};
    const digits = f.phone.replace(/\D/g, "");
    if (!f.firstName.trim()) e.firstName = "Enter your first name";
    if (!f.lastName.trim()) e.lastName = "Enter your last name";
    if (f.username.trim().length < 3) e.username = "Username must be at least 3 characters";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email";
    if (!digits) e.phone = "Enter your mobile number";
    else if (digits.length < 9) e.phone = `Mobile number is too short (${digits.length} of 9 digits)`;
    else if (digits.length > 9) e.phone = `Mobile number is too long (${digits.length} of 9 digits)`;
    else if (digits[0] !== "5") e.phone = "UAE mobile starts with 5 (e.g. 50 123 4567)";
    if (f.password.length < 8) e.password = "Password must be at least 8 characters";
    else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = "Use letters and numbers in your password";
    if (!accepted) e.legal = "Please accept the Terms & Conditions and Privacy Policy to continue";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setTimeout(() => {
      setProfile((p) => ({ ...p, firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email, phone: f.phone, memberSince: Date.now(), dob: "", nationality: "", address: "" }));
      onDone();
    }, 1000);
  };

  return (
    <div className="relative flex h-full flex-col bg-surface">
      <TopBar title="Create your account" left={<IconButton icon={ChevronLeft} label="Back" onClick={onLogin} />} />
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Card className="bg-reward-subtle px-4 py-3 text-sm">Earn 50 Joy Points instantly on signup</Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" autoComplete="given-name" value={f.firstName} error={errors.firstName} onChange={set("firstName")} />
          <Field label="Last name" autoComplete="family-name" value={f.lastName} error={errors.lastName} onChange={set("lastName")} />
        </div>
        <Field label="Username" autoComplete="username" value={f.username} error={errors.username} onChange={set("username")} />
        <Field label="Email Address" type="email" autoComplete="email" placeholder="your.email@example.com" value={f.email} error={errors.email} onChange={set("email")} />
        <Field label="Phone Number" inputMode="tel" autoComplete="tel-national" placeholder="50 123 4567" hint="UAE numbers only (+971)" value={f.phone} error={errors.phone} onChange={set("phone")} />
        <Field label="Password" type="password" autoComplete="new-password" hint="At least 8 characters, with letters and numbers" value={f.password} error={errors.password} onChange={set("password")} />

        <div>
          <div className="flex items-start gap-3">
            <button role="checkbox" aria-checked={accepted} aria-label="Accept terms and privacy policy" onClick={() => setAccepted((a) => !a)} className="-m-2 p-2">
              <Mark on={accepted} />
            </button>
            <p className="text-sm text-ink-2">
              I have read and accept the{" "}
              <Link onClick={() => setLegal("terms")}>Terms & Conditions</Link> and{" "}
              <Link onClick={() => setLegal("privacy")}>Privacy Policy</Link>.
            </p>
          </div>
          {errors.legal && <p role="alert" className="mt-1 text-sm text-error">{errors.legal}</p>}
        </div>

        <Button disabled={busy} onClick={submit}>{busy ? "Creating account…" : "Create account"}</Button>
        <p className="pb-4 text-center text-sm text-ink-2">
          Already have an account? <Link onClick={onLogin}>Log in</Link>
        </p>
      </div>
      <Sheet open={legal !== null} onClose={() => setLegal(null)} title={legal === "terms" ? "Terms & Conditions" : "Privacy Policy"}>
        <p className="text-sm text-ink-2">{legal && LEGAL[legal]}</p>
      </Sheet>
    </div>
  );
}

export function OnboardingScreen({ onDone, onUseDifferentAccount }: { onDone: () => void; onUseDifferentAccount: () => void }) {
  const { profile, setProfile } = useApp();
  const [dob, setDob] = useState(profile.dob);
  const [nationality, setNationality] = useState(profile.nationality);
  const [address, setAddress] = useState(profile.address);
  const [natOpen, setNatOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = () => {
    if (dob && new Date(dob) > new Date()) return setError("Enter a valid date of birth");
    setSaving(true);
    setTimeout(() => {
      setProfile((p) => ({ ...p, dob, nationality, address }));
      onDone();
    }, 800);
  };

  return (
    <div className="relative flex h-full flex-col bg-surface">
      <TopBar title="A few more details" />
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <p className="text-sm text-ink-2">Help us tailor offers and surprise you on your special days.</p>
        <Field label="Date of birth" type="date" autoComplete="bday" value={dob} error={error} onChange={(e) => { setDob(e.target.value); setError(null); }} />
        <div>
          <span className="mb-1 block text-sm font-medium text-ink-2">Nationality</span>
          <button onClick={() => setNatOpen(true)} aria-label="Select nationality" className={`${INPUT_CLASS} flex items-center justify-between border-line-strong text-left`}>
            <span className={nationality ? "" : "text-ink-3"}>{nationality || "Select your nationality"}</span>
            <ChevronDown className="h-4 w-4 text-ink-3" />
          </button>
        </div>
        <Field label="Home address" autoComplete="street-address" placeholder="Building, street, area" value={address} onChange={(e) => setAddress(e.target.value)} />
        <div className="space-y-2 pt-2">
          <Button disabled={saving} onClick={submit}>{saving ? "Saving…" : "Continue"}</Button>
          <Button variant="ghost" onClick={onDone}>Not now</Button>
        </div>
        <p className="text-center"><Link className="!text-ink-2" onClick={onUseDifferentAccount}>Use a different account</Link></p>
      </div>
      <Sheet open={natOpen} onClose={() => setNatOpen(false)} title="Select nationality">
        <Card role="radiogroup" aria-label="Nationality">
          {NATIONALITIES.map((n) => (
            <Choice key={n} shape="radio" on={nationality === n} label={n} onClick={() => { setNationality(n); setNatOpen(false); }} />
          ))}
        </Card>
      </Sheet>
    </div>
  );
}
