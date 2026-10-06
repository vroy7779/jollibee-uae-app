import { useEffect, useState } from "react";
import { Drumstick, Fingerprint } from "lucide-react";
import { Button, Field, HeaderGlow, INPUT_CLASS, Link } from "./ds";
import jollibeeLogoImage from "figma:asset/1e496394e0813a19c39f1c1f9fb0af673606157c.png";

interface LoginScreenProps {
  onLogin: () => void;
  onSignup?: () => void;
}

export function LoginScreen({ onLogin, onSignup }: LoginScreenProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const [resendIn, setResendIn] = useState(0);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handlePhoneSubmit = () => {
    if (phoneNumber[0] !== "5") return setPhoneError("UAE mobile starts with 5 (e.g. 50 123 4567)");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return setEmailError("Enter a valid email address.");
    setPhoneError(null);
    setShowOTP(true);
    setResendIn(30);
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOTP = [...otp];
      newOTP[index] = value;
      setOtp(newOTP);

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }

      // Auto-submit when all 6 digits are entered
      if (index === 5 && value && newOTP.every((digit) => digit !== "")) {
        setTimeout(() => onLogin(), 500);
      }
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleBiometricLogin = () => {
    // Simulate biometric authentication
    setTimeout(() => onLogin(), 1000);
  };

  return (
    <div className="flex min-h-full flex-col bg-bg">
      {/* Brand moment: logo and promise on red, with the reward spelled out in yellow underneath */}
      <div className="relative overflow-hidden bg-brand-gradient px-4 pb-8 pt-6 text-center text-white">
        <HeaderGlow />
        <div className="relative">
          <div className="flex justify-start gap-4 text-sm">
            <button aria-pressed className="h-10 font-bold">English</button>
            <button className="h-10 font-medium" lang="ar">العربية</button>
          </div>
          <img src={jollibeeLogoImage} alt="Jollibee" className="anim-pop mx-auto h-24 w-24" />
          <h1 className="anim-rise mt-4 text-3xl font-bold leading-tight tracking-tight">
            EARN REWARDS
            <span className="block text-reward">WITH EVERY BITE</span>
          </h1>
        </div>
      </div>
      <div className="anim-rise flex items-center gap-3 bg-reward px-4 py-4 text-ink">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white"><Drumstick className="h-6 w-6" /></span>
        <div>
          <p className="text-sm">Collect 600 points</p>
          <p className="font-bold">GET A FREE CHICKEN DISH</p>
        </div>
      </div>

      {!showOTP ? (
        <div className="stagger -mt-3 flex-1 space-y-4 rounded-t-xl bg-bg p-4 pt-5">
          <div>
            <label htmlFor="login-phone" className="mb-1 block text-sm font-medium text-ink-2">Phone Number</label>
            <div className={`${INPUT_CLASS} flex items-center gap-2 focus-within:border-ink ${phoneError ? "border-error" : "border-line-strong"}`}>
              <span className="t-num text-ink-2">+971</span>
              <input
                id="login-phone"
                type="tel"
                autoComplete="tel-national"
                placeholder="50 123 4567"
                value={phoneNumber}
                onChange={(e) => { setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 9)); setPhoneError(null); }}
                className="t-num h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3"
              />
            </div>
            {phoneError && <p role="alert" className="mt-1 text-sm text-error">{phoneError}</p>}
          </div>

          <Field label="Email Address" type="email" autoComplete="email" placeholder="your.email@example.com" value={email} error={emailError} onChange={(e) => { setEmail(e.target.value); setEmailError(null); }} />

          <div className="space-y-2 pt-2">
            <Button onClick={handlePhoneSubmit} disabled={phoneNumber.length < 9}>Send OTP</Button>
            <Button className="!bg-ink !text-white hover:!bg-ink-2" onClick={handleBiometricLogin}>
              <Fingerprint className="h-5 w-5" /> Login with Biometrics
            </Button>
          </div>

          <p className="pt-2 text-center text-sm text-ink-2">
            New to Jollibee? <Link onClick={onSignup}>Create account</Link>
          </p>
        </div>
      ) : (
        <div className="anim-rise -mt-3 flex-1 rounded-t-xl bg-bg p-4 pt-5">
          <h2 className="t-h2">Verify your number</h2>
          <p className="mt-1 text-sm text-ink-2">
            We sent a 6-digit code to <span className="t-num font-semibold text-ink">+971 {phoneNumber}</span>
          </p>

          <div className="mt-5 flex gap-2" role="group" aria-label="6-digit code">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="tel"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${index + 1}`}
                maxLength={1}
                value={digit}
                onChange={(e) => handleOTPChange(index, e.target.value)}
                onKeyDown={(e) => handleOTPKeyDown(index, e)}
                className="t-num h-14 w-full min-w-0 rounded-md border-2 border-line bg-surface text-center text-xl font-bold text-brand-text outline-none focus:border-brand"
                autoFocus={index === 0}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-3">Mock OTP: use any 6 digits</p>

          <div className="mt-6 flex items-center justify-between">
            <Link disabled={resendIn > 0} onClick={() => { setOtp(["", "", "", "", "", ""]); setResendIn(30); }}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </Link>
            <Link className="!text-ink-2" onClick={() => { setShowOTP(false); setOtp(["", "", "", "", "", ""]); }}>Change Phone Number</Link>
          </div>
        </div>
      )}
    </div>
  );
}
