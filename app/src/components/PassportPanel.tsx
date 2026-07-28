import { Award, CircleDollarSign, Fingerprint, ShoppingBag } from "lucide-react";
import { getTierProgress } from "../lib/loyalty";
import { formatPoints, truncateAddress } from "../lib/format";
import type { Passport } from "../types";

export function PassportPanel({ passport }: { passport: Passport }) {
  const progress = getTierProgress(passport.lifetimePoints, passport.tier);

  return (
    <section className="panel passport-panel" aria-labelledby="passport-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Customer account</span>
          <h2 id="passport-title">Alliance Passport</h2>
        </div>
        <span className={`tier-badge tier-${passport.tier.toLowerCase()}`}>
          <Award aria-hidden="true" size={15} />
          {passport.tier}
        </span>
      </div>

      <div className="passport-identity">
        <div className="passport-monogram" aria-hidden="true">
          AP
        </div>
        <div>
          <strong>{passport.displayName}</strong>
          <span title={passport.owner}>{truncateAddress(passport.owner)}</span>
        </div>
      </div>

      <div className="balance-block">
        <span>Shared coalition balance</span>
        <strong>{formatPoints(passport.balance)}</strong>
        <small>Alliance points</small>
      </div>

      <div className="tier-progress">
        <div className="tier-progress-label">
          <span>
            {progress.nextTier
              ? `${formatPoints(progress.pointsRemaining)} to ${progress.nextTier}`
              : "Top tier reached"}
          </span>
          <span>{Math.round(progress.percent)}%</span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label={
            progress.nextTier
              ? `Progress to ${progress.nextTier}`
              : "Gold tier complete"
          }
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress.percent)}
        >
          <span style={{ width: `${progress.percent}%` }} />
        </div>
      </div>

      <dl className="passport-metrics">
        <div>
          <dt>
            <CircleDollarSign aria-hidden="true" size={15} />
            Lifetime
          </dt>
          <dd>{formatPoints(passport.lifetimePoints)}</dd>
        </div>
        <div>
          <dt>
            <ShoppingBag aria-hidden="true" size={15} />
            Purchases
          </dt>
          <dd>{passport.purchaseCount}</dd>
        </div>
        <div>
          <dt>
            <Fingerprint aria-hidden="true" size={15} />
            Merchants
          </dt>
          <dd>{passport.uniqueMerchants}</dd>
        </div>
      </dl>
    </section>
  );
}
