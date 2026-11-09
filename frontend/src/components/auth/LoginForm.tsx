
"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";
import { MotionConfig, motion } from "framer-motion";
import { CircleAlert, Eye, EyeOff, HeartPulse, Info } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/lib/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_MIN_LENGTH = 6;
const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

type FieldName = "email" | "password";
type Errors = Partial<Record<FieldName, string>>;

const ROLES: UserRole[] = [
  "Desk Executive",
  "Desk Head",
  "Treating Doctor",
  "CFO",
];

function getRoleRedirect(roles: UserRole[]): string {
  if (roles.includes("Treating Doctor")) {
    return "/dashboard/doctor-approvals";
  }

  if (roles.includes("CFO")) {
    return "/dashboard/cfo-reports";
  }

  return "/dashboard";
}

function validate(email: string, password: string): Errors {
  const errors: Errors = {};

  if (!email.trim()) {
    errors.email = "Enter your work email.";
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = "Enter a valid email, like you@hospital.com.";
  }

  if (!password) {
    errors.password = "Enter your password.";
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  return errors;
}

function Field({
  id,
  label,
  error,
  action,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {action}
      </div>

      {children}

      <div aria-live="polite">
        {error && (
          <p
            id={`${id}-error`}
            className="mt-1.5 flex items-start gap-1.5 text-[13px] text-alert"
          >
            <CircleAlert size={14} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function inputShell(hasError: boolean) {
  return [
    "flex h-11 items-center gap-2 rounded-lg border bg-white px-3.5 shadow-sm transition",
    "focus-within:ring-4",
    hasError
      ? "border-alert focus-within:ring-alert/15"
      : "border-line hover:border-ink/30 focus-within:border-ink focus-within:ring-ink/10",
  ].join(" ");
}

export default function LoginForm() {
  const router = useRouter();
  const { login, user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Desk Executive");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [validated, setValidated] = useState(false);

  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    email: false,
    password: false,
  });

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace(getRoleRedirect(user.roles));
    }
  }, [loading, user, router]);

  const errors = validate(email, password);

  const visibleErrors: Errors = {
    email: touched.email ? errors.email : undefined,
    password: touched.password ? errors.password : undefined,
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setTouched({ email: true, password: true });
    setAuthError("");
    setValidated(false);

    if (errors.email) {
      emailRef.current?.focus();
      return;
    }

    if (errors.password) {
      passwordRef.current?.focus();
      return;
    }

    try {
      setSubmitting(true);

      await login(email.trim(), password, role, keepSignedIn);

      setValidated(true);
      router.replace(getRoleRedirect([role]));
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || user) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-ink" />
          <p className="text-sm text-muted">Checking your session...</p>
        </div>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -15% 0px" }}
        transition={{ duration: 0.8, ease: EASE }}
        aria-labelledby="signin-title"
        className="rounded-2xl bg-white p-8 text-ink shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)] sm:p-10"
      >
        <div className="flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-paper">
            <HeartPulse size={22} strokeWidth={1.9} />
          </span>

          <h2
            id="signin-title"
            className="mt-5 text-2xl font-semibold tracking-[-0.03em]"
          >
            Sign in to ClaimFlow
          </h2>

          <p className="mt-1.5 text-sm text-muted">
            Enter your work email and password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
          <Field id="role" label="Sign in as">
            <div className={inputShell(false)}>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(event) => {
                  setRole(event.target.value as UserRole);
                  setAuthError("");
                  setValidated(false);
                }}
                className="h-full w-full cursor-pointer bg-transparent text-sm outline-none"
              >
                {ROLES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field id="email" label="Email" error={visibleErrors.email}>
            <div className={inputShell(Boolean(visibleErrors.email))}>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@hospital.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setValidated(false);
                  setAuthError("");
                }}
                onBlur={() =>
                  setTouched((current) => ({ ...current, email: true }))
                }
                aria-invalid={Boolean(visibleErrors.email)}
                aria-describedby={
                  visibleErrors.email ? "email-error" : undefined
                }
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted/60"
              />
            </div>
          </Field>

          <Field
            id="password"
            label="Password"
            error={visibleErrors.password}
            action={
              <button
                type="button"
                disabled
                title="Password reset isn't available yet"
                className="cursor-not-allowed text-[13px] text-muted/60"
              >
                Forgot password?
              </button>
            }
          >
            <div className={inputShell(Boolean(visibleErrors.password))}>
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setValidated(false);
                  setAuthError("");
                }}
                onBlur={() =>
                  setTouched((current) => ({ ...current, password: true }))
                }
                aria-invalid={Boolean(visibleErrors.password)}
                aria-describedby={
                  visibleErrors.password ? "password-error" : undefined
                }
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted/60"
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <label className="flex cursor-pointer select-none items-center gap-2.5 pt-1 text-sm text-muted">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(event) => setKeepSignedIn(event.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-line accent-ink"
            />
            Keep me signed in
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-lg bg-ink text-sm font-medium text-white shadow-sm transition hover:bg-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          <div aria-live="polite">
            {authError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-alert/30 bg-alert/5 px-3.5 py-3 text-[13px] leading-5 text-alert"
              >
                <CircleAlert size={15} className="mt-0.5 shrink-0" />
                {authError}
              </p>
            )}

            {validated && (
              <p
                role="status"
                className="flex items-start gap-2 rounded-lg border border-line bg-paper px-3.5 py-3 text-[13px] leading-5 text-muted"
              >
                <Info size={15} className="mt-0.5 shrink-0 text-ink" />
                Sign-in successful. Redirecting to your workspace...
              </p>
            )}
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Don’t have an account?{" "}
          <span className="font-medium text-ink">Ask your desk head.</span>
        </p>
      </motion.section>
    </MotionConfig>
  );
}
