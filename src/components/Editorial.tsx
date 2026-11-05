import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw } from "lucide-react";
import { appRoutes } from "../lib/routes";

export function TetherMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="32"
      height="30"
      viewBox="0 0 32 30"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11 20V10a7 7 0 1 1 7 7H8a7 7 0 1 1 7-7v10a7 7 0 1 0 7-7H12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function Brand({ home = false }: { home?: boolean }) {
  return (
    <Link
      to={home ? appRoutes.landing : appRoutes.feed}
      className="brand"
      aria-label="Tether home"
    >
      <TetherMark />
      <span>
        tether<span className="brand-period">.</span>
      </span>
    </Link>
  );
}

export function EvidenceBadge({ state = "emerging" }: { state?: string }) {
  const labels: Record<string, string> = {
    verified: "Stronger archive match",
    emerging: "Emerging connection",
    "archive-gap": "Limited evidence",
    "current-event": "Current reporting",
  };
  return (
    <span className={`evidence-badge evidence-${state}`}>
      <span aria-hidden="true" />
      {labels[state] || "Under review"}
    </span>
  );
}

export function EditorialImage({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  return (
    <div className={`editorial-image ${className}`}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="image-fallback"
          role="img"
          aria-label="Tether editorial illustration"
        >
          <TetherMark />
          <span>A wider perspective.</span>
        </div>
      )}
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {children}
    </header>
  );
}

export function LoadingState({
  label = "Opening the archive…",
}: {
  label?: string;
}) {
  return (
    <div className="reading-state" role="status">
      <RefreshCw size={22} className="animate-spin" />
      <h2>{label}</h2>
      <p>Finding the context behind the story.</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  onAction,
  href,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
  href?: string;
}) {
  return (
    <div className="reading-state">
      <TetherMark />
      <h2>{title}</h2>
      <p>{description}</p>
      {action &&
        (href ? (
          <Link className="button-primary" to={href}>
            {action}
            <ArrowRight size={16} />
          </Link>
        ) : (
          <button className="button-primary" onClick={onAction}>
            {action}
            <ArrowRight size={16} />
          </button>
        ))}
    </div>
  );
}
