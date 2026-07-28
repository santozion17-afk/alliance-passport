import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Clipboard,
  Database,
  Inbox,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function ExternalLink({
  href,
  children,
  className = "text-link",
  ariaLabel,
}: ExternalLinkProps) {
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={ariaLabel}
    >
      {children}
      <ArrowUpRight aria-hidden="true" size={14} strokeWidth={2} />
    </a>
  );
}

interface CopyButtonProps {
  value: string;
  label: string;
}

export function CopyButton({ value, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <button
      className="icon-button"
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? "Copied" : `Copy ${label}`}
    >
      {copied ? (
        <Check aria-hidden="true" size={16} />
      ) : (
        <Clipboard aria-hidden="true" size={16} />
      )}
    </button>
  );
}

export function LoadingState({
  label = "Loading coalition state",
}: {
  label?: string;
}) {
  return (
    <div className="state-view state-loading" role="status" aria-live="polite">
      <LoaderCircle
        className="spin"
        aria-hidden="true"
        size={24}
        strokeWidth={1.8}
      />
      <div>
        <strong>{label}</strong>
        <span>Reading the latest Devnet snapshot.</span>
      </div>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="state-view state-error" role="alert">
      <AlertTriangle aria-hidden="true" size={24} strokeWidth={1.8} />
      <div>
        <strong>Devnet snapshot unavailable</strong>
        <span>
          The last known state is preserved. Check the RPC and try the request
          again.
        </span>
      </div>
      <button className="button button-secondary" type="button" onClick={onRetry}>
        <RefreshCw aria-hidden="true" size={16} />
        Retry
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <Inbox size={22} strokeWidth={1.7} />
      </span>
      <strong>{title}</strong>
      <p>{detail}</p>
      {action}
    </div>
  );
}

export function DataSourceNote() {
  return (
    <span className="source-note">
      <Database aria-hidden="true" size={13} />
      Sample state, deterministic PDAs
    </span>
  );
}
