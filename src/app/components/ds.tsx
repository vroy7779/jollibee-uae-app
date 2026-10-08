/*
 * Design-system primitives. Screens compose these instead of styling raw elements,
 * so a button, a card or a field looks the same wherever it appears.
 * Tokens live in src/styles/theme.css; the rules are in guidelines/Guidelines.md.
 */
import { Check, ChevronLeft, ChevronRight, Minus, Plus, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../store";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/* ---------- Actions ---------- */

type ButtonVariant = "primary" | "secondary" | "reward" | "ghost" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-pressed",
  secondary: "border-2 border-brand bg-surface text-brand-text hover:bg-brand-subtle",
  // The call to action on red surfaces, where a red button would vanish
  reward: "bg-reward text-ink hover:bg-zest",
  ghost: "text-ink-2 hover:bg-sunken",
  danger: "border border-line-strong bg-surface text-error hover:bg-error-subtle",
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  fit,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "md" | "sm"; fit?: boolean }) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold disabled:cursor-not-allowed disabled:opacity-45",
        size === "md" ? "h-12 px-4 text-base" : "h-9 px-3 text-sm",
        !fit && "w-full",
        BUTTON_VARIANTS[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  className,
  ...rest
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { icon: LucideIcon; label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      className={cx("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-ink hover:bg-sunken", className)}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

/** Inline text action: "Change", "Edit cart", "View all". */
export function Link({ children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={cx("-my-2 py-2 text-sm font-semibold text-brand-text hover:text-ink disabled:text-ink-3", className)}>
      {children}
    </button>
  );
}

/* ---------- Layout ---------- */

/** Red title bar. Buttons and links placed in it turn white so they stay legible. */
export function TopBar({ title, left, right }: { title: React.ReactNode; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="flex min-h-14 items-center gap-1 bg-brand px-2 pb-1 pt-6 text-white [&_button:hover]:!bg-white/15 [&_button]:!text-white">
      {left}
      <h1 className={cx("t-h3 min-w-0 flex-1 truncate", !left && "pl-2")}>{title}</h1>
      {right}
    </header>
  );
}

/** A pushed screen: title bar with back, scrolling body, optional pinned footer. */
export function ScreenShell({
  title,
  onBack,
  right,
  footer,
  children,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { pop } = useApp();
  return (
    <div className="anim-screen absolute inset-0 z-[60] flex flex-col bg-bg">
      <TopBar title={title} left={<IconButton icon={ChevronLeft} label="Back" onClick={onBack ?? pop} />} right={right} />
      <div className="flex-1 overflow-y-auto">{children}</div>
      {footer && <div className="border-t border-line bg-surface px-4 py-3">{footer}</div>}
    </div>
  );
}

export function Section({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="px-4 pt-6">
      {(title || action) && (
        <div className="mb-2 flex items-center justify-between">
          <h2 className="t-label flex items-center gap-2 text-ink-2">
            {title && <span aria-hidden className="h-3 w-1 rounded-full bg-reward" />}
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** The one container surface: white on the cream page, with a soft lift. */
export function Card({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cx("overflow-hidden rounded-lg border border-line bg-surface shadow-card", className)}>
      {children}
    </div>
  );
}

/* ---------- Lists ---------- */

/** Square food photo. Decorative next to a name, so it carries no alt text by default. */
export function Thumb({ src, alt = "", size = "md" }: { src: string; alt?: string; size?: "sm" | "md" | "lg" }) {
  const box = { sm: "h-12 w-12", md: "h-16 w-16", lg: "h-20 w-20" }[size];
  return (
    <div className={cx("flex-shrink-0 overflow-hidden rounded-md bg-sunken", box)}>
      {src && <ImageWithFallback src={src} alt={alt} className="h-full w-full object-cover" />}
    </div>
  );
}

export type Tint = "brand" | "reward" | "accent" | "success" | "neutral";

const TINTS: Record<Tint, string> = {
  brand: "bg-brand-subtle text-brand-text",
  reward: "bg-reward-subtle text-zest-text",
  accent: "bg-zest-subtle text-zest-text",
  success: "bg-success-subtle text-success",
  neutral: "bg-sunken text-ink-2",
};

/** Icon on a tinted square: the app's way of giving a row or shortcut its own colour. */
export function IconChip({ icon: Icon, tint = "brand", size = "md" }: { icon: LucideIcon; tint?: Tint; size?: "md" | "lg" }) {
  return (
    <span aria-hidden className={cx("flex flex-shrink-0 items-center justify-center rounded-md", size === "md" ? "h-9 w-9" : "h-11 w-11", TINTS[tint])}>
      <Icon className={size === "md" ? "h-5 w-5" : "h-6 w-6"} />
    </span>
  );
}

export function Row({
  icon,
  tint,
  label,
  sub,
  value,
  onClick,
  tone,
}: {
  icon?: LucideIcon;
  tint?: Tint;
  label: string;
  sub?: string;
  value?: React.ReactNode;
  onClick?: () => void;
  tone?: "danger";
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cx(
        "flex min-h-12 w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0",
        onClick && "hover:bg-sunken",
      )}
    >
      {icon && <IconChip icon={icon} tint={tint} />}
      <span className="min-w-0 flex-1">
        <span className={cx("block", tone === "danger" ? "text-error" : "text-ink")}>{label}</span>
        {sub && <span className="block text-sm text-ink-3">{sub}</span>}
      </span>
      {value !== undefined && <span className="t-num text-sm text-ink-3">{value}</span>}
      {onClick && <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-3 rtl:rotate-180" />}
    </Tag>
  );
}

/** Label / value pair for summaries and receipts. */
export function Line({ label, value, strong, tone }: { label: string; value: React.ReactNode; strong?: boolean; tone?: "success" }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-4 py-1", strong ? "font-semibold text-ink" : "text-sm text-ink-2")}>
      <span>{label}</span>
      <span className={cx("t-num text-right", tone === "success" && "text-success")}>{value}</span>
    </div>
  );
}

export function Divider() {
  return <div className="my-2 border-t border-line" />;
}

/* ---------- Inputs ---------- */

export const INPUT_CLASS =
  "h-12 w-full rounded-md border bg-surface px-3 text-base text-ink outline-none placeholder:text-ink-3 focus:border-ink";

export function Field({
  label,
  error,
  hint,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string | null; hint?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-ink-2">{label}</span>}
      <input {...rest} aria-invalid={!!error} className={cx(INPUT_CLASS, error ? "border-error" : "border-line-strong")} />
      {error ? (
        <span role="alert" className="mt-1 block text-sm text-error">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>
      )}
    </label>
  );
}

/** Mutually exclusive options shown side by side: order mode, list filters, pay-with. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  onBrand,
  wide,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  /** Use on red surfaces: the track goes translucent and the selected segment white. */
  onBrand?: boolean;
  /** Fill the available width with equal segments. */
  wide?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("max-w-full gap-1 overflow-x-auto rounded-md p-1", wide ? "flex w-full" : "inline-flex", onBrand ? "bg-brand-deep" : "bg-sunken")}>
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            "whitespace-nowrap rounded-sm px-4 text-sm font-semibold",
            wide ? "h-10 flex-1" : "h-8",
            value === o.id
              ? onBrand ? "bg-surface text-brand-text" : "bg-brand text-white"
              : onBrand ? "text-white" : "text-ink-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Radio or checkbox indicator. */
export function Mark({ on, shape = "check" }: { on: boolean; shape?: "radio" | "check" }) {
  return (
    <span
      aria-hidden
      className={cx(
        "flex h-5 w-5 flex-shrink-0 items-center justify-center border",
        shape === "radio" ? "rounded-full" : "rounded-sm",
        on ? "border-brand bg-brand text-white" : "border-line-strong bg-surface",
      )}
    >
      {on && <Check className="anim-pop h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  );
}

/** A selectable row: add-on options, payment methods, pickers. */
export function Choice({
  on,
  shape = "check",
  label,
  sub,
  trailing,
  disabled,
  onClick,
}: {
  on: boolean;
  shape?: "radio" | "check";
  label: string;
  sub?: string;
  trailing?: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role={shape === "radio" ? "radio" : "checkbox"}
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "flex min-h-12 w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 disabled:opacity-45",
        on ? "bg-brand-subtle" : "hover:bg-sunken",
      )}
    >
      <Mark on={on} shape={shape} />
      <span className="min-w-0 flex-1">
        <span className="block text-ink">{label}</span>
        {sub && <span className="block text-sm text-ink-3">{sub}</span>}
      </span>
      {trailing !== undefined && <span className="t-num text-sm text-ink-3">{trailing}</span>}
    </button>
  );
}

export function Stepper({ qty, onDec, onInc }: { qty: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="inline-flex flex-shrink-0 items-center rounded-md border-2 border-brand bg-surface text-brand-text">
      <button onClick={onDec} aria-label="Decrease" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-brand-subtle">
        <Minus className="h-4 w-4" />
      </button>
      <span key={qty} aria-live="polite" className="anim-pop t-num min-w-6 text-center text-sm font-bold">{qty}</span>
      <button onClick={onInc} aria-label="Increase" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-brand-subtle">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ---------- Status ---------- */

type Tone = "neutral" | "brand" | "hot" | "reward" | "success" | "warning";

const BADGE_TONES: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-2",
  brand: "bg-brand-subtle text-brand-text",
  hot: "bg-brand text-white",
  reward: "bg-reward text-ink",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={cx("inline-flex whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-semibold", BADGE_TONES[tone])}>{children}</span>;
}

export function Progress({ value, tone = "brand" }: { value: number; tone?: "brand" | "reward" }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("anim-grow h-full rounded-full", tone === "brand" ? "bg-brand" : "bg-sunrise")} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

const TIER_COLOURS = ["bg-zest text-ink", "bg-line-strong text-white", "bg-reward text-ink", "bg-brand-deep text-reward"];

/** Tier level as a numeral on that tier's colour, so rank reads without relying on colour alone. */
export function TierMark({ level, muted, size = "md" }: { level: number; muted?: boolean; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cx(
        "flex flex-shrink-0 items-center justify-center rounded-full font-bold",
        size === "md" ? "h-9 w-9 text-sm" : "h-14 w-14 text-xl",
        muted ? "border border-line-strong text-ink-3" : TIER_COLOURS[level] ?? TIER_COLOURS[0],
      )}
    >
      {["I", "II", "III", "IV", "V"][level] ?? level + 1}
    </span>
  );
}

export function Empty({ icon: Icon, title, body, action }: { icon?: LucideIcon; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="px-8 py-12 text-center">
      {Icon && (
        <span aria-hidden className="anim-pop mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-reward text-brand-deep">
          <Icon className="h-9 w-9" />
        </span>
      )}
      <p className="t-h3">{title}</p>
      {body && <p className="mt-1 text-sm text-ink-3">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ label, sub }: { label: string; sub?: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-reward border-t-brand" />
      <p className="font-semibold">{label}</p>
      {sub && <p className="text-sm text-ink-3">{sub}</p>}
    </div>
  );
}

/* ---------- Overlays ---------- */

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[80] flex flex-col justify-end">
      <button aria-label="Close" className="anim-fade absolute inset-0 bg-ink/50 active:!transform-none" onClick={onClose} />
      <div role="dialog" aria-label={title} className="anim-sheet relative max-h-[88%] overflow-y-auto rounded-t-xl bg-surface p-4 pt-2 shadow-float">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="t-h3">{title}</h2>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="anim-fade absolute inset-0 z-[90] flex items-center justify-center bg-ink/50 p-6">
      <div role="alertdialog" aria-label={title} className="anim-pop w-full rounded-lg bg-surface p-5 shadow-float">
        <h2 className="t-h3">{title}</h2>
        <p className="mt-1 text-sm text-ink-2">{message}</p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div role="status" className="pointer-events-none absolute inset-x-4 bottom-20 z-[100] flex justify-center">
      <div key={toast} className="anim-rise rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-float">{toast}</div>
    </div>
  );
}

/* ---------- Brand flourishes ---------- */

/** Soft drifting shapes behind a red header. Purely decorative, and kept clear of the text. */
export function HeaderGlow() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="anim-float absolute -right-10 -top-16 h-36 w-36 rounded-full bg-reward/25" />
      <span className="anim-float absolute -bottom-20 -left-12 h-36 w-36 rounded-full bg-zest/25 [animation-delay:-3s]" />
    </span>
  );
}

/** A number that counts up to its value the first time it appears, and whenever it changes. */
export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);
  useEffect(() => {
    const still = document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) return setShown(value);
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 700);
      setShown(Math.round(start + (value - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = value; };
  }, [value]);
  return <>{shown.toLocaleString()}</>;
}

const BURST = [
  ["-64px", "-46px", "bg-reward"], ["60px", "-52px", "bg-brand"], ["-78px", "8px", "bg-zest"], ["80px", "4px", "bg-reward"],
  ["-48px", "56px", "bg-brand"], ["52px", "58px", "bg-zest"], ["0px", "-78px", "bg-success"], ["4px", "76px", "bg-reward"],
];

/** Success mark with a one-off burst of brand-coloured dots. */
export function SuccessMark() {
  return (
    <span className="relative flex h-20 w-20 items-center justify-center">
      {BURST.map(([dx, dy, colour], i) => (
        <span key={i} aria-hidden className={cx("anim-burst absolute h-2.5 w-2.5 rounded-full", colour)} style={{ "--dx": dx, "--dy": dy } as React.CSSProperties} />
      ))}
      <span className="anim-pop flex h-20 w-20 items-center justify-center rounded-full bg-success text-white">
        <Check className="h-10 w-10" strokeWidth={3} />
      </span>
    </span>
  );
}
