import {
  CheckCircle2,
  Coins,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NETWORK_CONFIG, UI_TIMING } from "../constants";
import { formatPoints } from "../lib/format";
import type { Merchant, Offer, Passport } from "../types";

interface RedemptionDialogProps {
  offer: Offer | null;
  merchant: Merchant | undefined;
  passport: Passport;
  onClose: () => void;
  onConfirm: (offer: Offer) => void;
}

export function RedemptionDialog({
  offer,
  merchant,
  passport,
  onClose,
  onConfirm,
}: RedemptionDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!offer) {
      return;
    }

    confirmRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [offer, onClose, submitting]);

  if (!offer) {
    return null;
  }

  function handleConfirm() {
    if (!offer) {
      return;
    }

    setSubmitting(true);
    window.setTimeout(() => {
      onConfirm(offer);
      setSubmitting(false);
    }, UI_TIMING.redemptionMs);
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="redemption-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="redemption-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <span className="dialog-icon" aria-hidden="true">
            <Coins size={22} strokeWidth={1.8} />
          </span>
          <div>
            <span className="eyebrow">Confirm redemption</span>
            <h2 id="redemption-title">{offer.title}</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close redemption dialog"
            title="Close"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <p className="dialog-description">
          {merchant?.name ?? "Coalition merchant"} will validate the redemption
          PDA before fulfilling this offer.
        </p>

        <dl className="redemption-summary">
          <div>
            <dt>Current balance</dt>
            <dd>{formatPoints(passport.balance)} points</dd>
          </div>
          <div>
            <dt>Offer cost</dt>
            <dd>-{formatPoints(offer.pointsCost)} points</dd>
          </div>
          <div className="redemption-total">
            <dt>Balance after</dt>
            <dd>
              {formatPoints(passport.balance - offer.pointsCost)} points
            </dd>
          </div>
        </dl>

        <div className="devnet-confirmation">
          <ShieldCheck aria-hidden="true" size={18} />
          <div>
            <strong>{NETWORK_CONFIG.label} simulation</strong>
            <span>
              This demo creates local preview state. It does not sign or submit a
              transaction.
            </span>
          </div>
        </div>

        <div className="dialog-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            className="button button-primary"
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <LoaderCircle className="spin" aria-hidden="true" size={16} />
                Deriving PDA
              </>
            ) : (
              <>
                <LockKeyhole aria-hidden="true" size={16} />
                Confirm redemption
              </>
            )}
          </button>
        </div>

        <div className="sr-only" aria-live="polite">
          {submitting ? "Redemption is being prepared" : ""}
        </div>
      </div>
    </div>
  );
}
