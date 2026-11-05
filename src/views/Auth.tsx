import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Brand, EditorialImage } from "../components/Editorial";
import { useAuth } from "../components/AuthProvider";
import { getAuthErrorMessage } from "../lib/auth-client";
import {
  isGoogleAuthEnabled,
  isSupabaseConfigured,
} from "../lib/supabase/client";
import {
  appRoutes,
  buildAuthPath,
  sanitizeNextPath,
  type AuthMode,
} from "../lib/routes";

function getMode(value: string | null): AuthMode {
  if (value === "sign-up" || value === "forgot-password") {
    return value;
  }

  return "sign-in";
}

export function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    isAuthReady,
    user,
    signIn,
    signUp,
    signInWithGoogle,
    sendPasswordReset,
  } = useAuth();
  const mode = getMode(searchParams.get("mode"));
  const next = useMemo(
    () => sanitizeNextPath(searchParams.get("next")) || appRoutes.feed,
    [searchParams],
  );
  const returnToReading =
    next.startsWith("/comparisons/") || next.startsWith("/requests/")
      ? next
      : appRoutes.explore;
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthReady && user && mode !== "forgot-password") {
      navigate(next, { replace: true });
    }
  }, [isAuthReady, mode, navigate, next, user]);

  const updateMode = (nextMode: AuthMode) => {
    setError(null);
    setNotice(null);
    navigate(buildAuthPath(next, nextMode), { replace: true });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter your email address.");
      return;
    }

    if (mode === "forgot-password") {
      setIsSubmitting(true);
      try {
        await sendPasswordReset(normalizedEmail);
        setNotice(
          "If an account exists for that email, a reset link is on its way.",
        );
      } catch (authError) {
        setError(getAuthErrorMessage(authError));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    if (mode === "sign-up" && !displayName.trim()) {
      setError("Enter a name for your archive.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "sign-up") {
        const result = await signUp(
          normalizedEmail,
          password,
          displayName,
          next,
        );
        if (!result.hasSession) {
          setNotice(
            "Check your email to confirm your account, then return here to sign in.",
          );
          navigate(buildAuthPath(next, "sign-in"), { replace: true });
        } else {
          navigate(next, { replace: true });
        }
      } else {
        await signIn(normalizedEmail, password);
        navigate(next, { replace: true });
      }
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      await signInWithGoogle(next);
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
      setIsSubmitting(false);
    }
  };

  const title =
    mode === "sign-up"
      ? "A place for your perspective."
      : mode === "forgot-password"
        ? "Find your way back."
        : "Pick up the thread.";
  const description =
    mode === "sign-up"
      ? "Keep the connections that matter to you. Build a personal reading desk, one perspective at a time."
      : mode === "forgot-password"
        ? "We’ll send a reset link to your email so you can choose a new password."
        : "Your saved connections and questions are waiting. Sign in to continue where you left off.";
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Brand home />
        <button className="text-link" onClick={() => navigate(returnToReading)}>
          <ArrowLeft size={14} />
          Back to reading
        </button>
      </header>
      <main className="auth-layout">
        <section className="auth-intro">
          <p className="eyebrow">Your personal reading desk</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <EditorialImage
            className="auth-image"
            src="/images/reading-room.jpg"
            alt="Books arranged on wooden library shelves"
            eager
          />
          <p className="photo-credit">
            A place for a little perspective. · Photo via Unsplash
          </p>
        </section>
        <section
          className="auth-form-panel"
          aria-label={
            mode === "sign-up"
              ? "Create account"
              : mode === "forgot-password"
                ? "Password recovery"
                : "Sign in"
          }
        >
          <p className="eyebrow">
            {mode === "sign-up"
              ? "Make yourself at home"
              : mode === "forgot-password"
                ? "Account recovery"
                : "Welcome back"}
          </p>
          <h2>
            {mode === "sign-up"
              ? "Create your account."
              : mode === "forgot-password"
                ? "Reset your password."
                : "Sign in to Tether."}
          </h2>
          {!isSupabaseConfigured && (
            <div className="notice error" role="alert">
              Sign-in is not available in this environment yet. You can still
              read and explore the archive.
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
          {error && (
            <div className="notice error" role="alert" id="auth-error">
              {error}
            </div>
          )}
          {mode !== "forgot-password" && isGoogleAuthEnabled && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || !isSupabaseConfigured}
                className="button-secondary"
              >
                <span aria-hidden="true">G</span>Continue with Google
              </button>
              <div className="auth-divider">or continue with email</div>
            </>
          )}
          <form
            onSubmit={handleSubmit}
            aria-describedby={error ? "auth-error" : undefined}
          >
            {mode === "sign-up" && (
              <label>
                <span className="field-label">Your name</span>
                <input
                  className="field-input"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we call you?"
                  required
                />
              </label>
            )}
            <label>
              <span className="field-label">Email address</span>
              <input
                className="field-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            {mode !== "forgot-password" && (
              <label>
                <span className="field-label">Password</span>
                <span className="password-field">
                  <input
                    className="field-input"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      mode === "sign-up" ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    placeholder={
                      mode === "sign-up"
                        ? "At least 8 characters"
                        : "Your password"
                    }
                    required
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>
            )}
            {mode === "sign-in" && (
              <button
                type="button"
                className="text-link"
                onClick={() => updateMode("forgot-password")}
              >
                Forgot your password?
              </button>
            )}
            <button
              type="submit"
              className="button-primary"
              disabled={isSubmitting || !isSupabaseConfigured}
            >
              {isSubmitting
                ? "One moment…"
                : mode === "sign-up"
                  ? "Create account"
                  : mode === "forgot-password"
                    ? "Send reset link"
                    : "Sign in"}
              <ArrowRight size={16} />
            </button>
          </form>
          <div className="auth-switch">
            {mode === "forgot-password" ? (
              <button onClick={() => updateMode("sign-in")}>
                Return to sign in
              </button>
            ) : mode === "sign-up" ? (
              <>
                Already have an account?{" "}
                <button onClick={() => updateMode("sign-in")}>Sign in</button>
              </>
            ) : (
              <>
                New here?{" "}
                <button onClick={() => updateMode("sign-up")}>
                  Create an account
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
