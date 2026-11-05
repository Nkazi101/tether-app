import React, { useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { Brand, LoadingState } from "../components/Editorial";
import { useAuth } from "../components/AuthProvider";
import { getAuthErrorMessage } from "../lib/auth-client";
import { appRoutes, buildAuthPath } from "../lib/routes";

export function UpdatePassword() {
  const navigate = useNavigate();
  const { user, isAuthReady, isPasswordRecovery, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  if (!isAuthReady) {
    return (
      <div className="page-wrap">
        <LoadingState label="Restoring your session…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={buildAuthPath(null, "forgot-password")} replace />;
  }

  if (!isPasswordRecovery && !isComplete) {
    return <Navigate to={appRoutes.feed} replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(password);
      setIsComplete(true);
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Brand home />
      </header>
      <main className="auth-layout">
        <section className="auth-intro">
          <p className="eyebrow">Account recovery</p>
          <h1>
            {isComplete
              ? "Ready for a fresh start."
              : "A new password. The same perspective."}
          </h1>
          <p>Your saved connections and preferences stay with your account.</p>
        </section>
        <section className="auth-form-panel">
          {isComplete ? (
            <>
              <CheckCircle2 size={28} />
              <h2>Password updated.</h2>
              <p className="search-helper">
                You can use your new password the next time you sign in.
              </p>
              <button
                className="button-primary"
                onClick={() => navigate(appRoutes.feed)}
                style={{ marginTop: 25 }}
              >
                Continue reading <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <p className="eyebrow">Make yourself at home again</p>
              <h2>Choose a new password.</h2>
              {error && (
                <div className="notice error" role="alert">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <label>
                  <span className="field-label">New password</span>
                  <span className="password-field">
                    <input
                      className="field-input"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      placeholder="At least 8 characters"
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
                <label>
                  <span className="field-label">Confirm new password</span>
                  <input
                    className="field-input"
                    type={showPassword ? "text" : "password"}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Repeat your new password"
                    required
                  />
                </label>
                <button
                  className="button-primary"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Updating…" : "Update password"}
                  <ArrowRight size={16} />
                </button>
              </form>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
