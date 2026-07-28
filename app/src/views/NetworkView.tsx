import {
  Activity,
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  Coins,
  Gauge,
} from "lucide-react";
import { useState } from "react";
import { calculateNetworkMultiplier } from "../lib/loyalty";
import { formatCompact, formatPoints, formatUsdcMinor } from "../lib/format";
import type { Merchant, Passport } from "../types";
import { EmptyState } from "../components/Ui";

export function NetworkView({
  merchants,
  passport,
}: {
  merchants: Merchant[];
  passport: Passport;
}) {
  const [merchantCount, setMerchantCount] = useState(
    Math.max(1, passport.uniqueMerchants),
  );
  const projectedMultiplier = calculateNetworkMultiplier(merchantCount);
  const totalIssued = merchants.reduce(
    (total, merchant) => total + merchant.issuedPoints,
    0,
  );
  const totalSpend = merchants.reduce(
    (total, merchant) => total + merchant.spendMinor,
    0,
  );

  return (
    <div className="view-stack">
      <div className="view-heading">
        <div>
          <span className="eyebrow">Coalition economics</span>
          <h1>Merchant network</h1>
          <p>
            Signed purchases from separate merchant authorities compound the
            member&apos;s network bonus without sharing custody.
          </p>
        </div>
        <div className="view-context">
          <Building2 aria-hidden="true" size={18} />
          <span>
            <strong>{merchants.length} active issuers</strong>
            Independent authorities, common policy
          </span>
        </div>
      </div>

      <section className="network-kpis" aria-label="Coalition metrics">
        <div>
          <Coins aria-hidden="true" size={18} />
          <span>Total issued</span>
          <strong>{formatCompact(totalIssued)} points</strong>
        </div>
        <div>
          <BadgeDollarSign aria-hidden="true" size={18} />
          <span>Member spend</span>
          <strong>{formatUsdcMinor(totalSpend)}</strong>
        </div>
        <div>
          <Activity aria-hidden="true" size={18} />
          <span>Combined visits</span>
          <strong>
            {formatPoints(
              merchants.reduce(
                (total, merchant) => total + merchant.visits,
                0,
              ),
            )}
          </strong>
        </div>
      </section>

      <section
        className="panel multiplier-panel"
        aria-labelledby="multiplier-title"
      >
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Mechanism simulator</span>
            <h2 id="multiplier-title">Network multiplier</h2>
          </div>
          <span className="network-bonus">
            <Gauge aria-hidden="true" size={15} />+{projectedMultiplier}%
          </span>
        </div>

        <div className="multiplier-layout">
          <div className="multiplier-control">
            <label htmlFor="merchant-count">
              Distinct merchants visited
              <strong>{merchantCount}</strong>
            </label>
            <input
              id="merchant-count"
              type="range"
              min="1"
              max="8"
              step="1"
              value={merchantCount}
              onChange={(event) =>
                setMerchantCount(Number.parseInt(event.target.value, 10))
              }
            />
            <div className="range-labels" aria-hidden="true">
              <span>1 merchant</span>
              <span>8 merchants</span>
            </div>
            <p>
              Each distinct merchant beyond the first adds 2.5%, capped at 15%.
              MerchantVisit PDAs prevent self-reported discovery.
            </p>
          </div>

          <div
            className="multiplier-chart"
            role="img"
            aria-label={`Multiplier chart. ${merchantCount} merchants produces a ${projectedMultiplier} percent bonus.`}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((count) => {
              const value = calculateNetworkMultiplier(count);
              return (
                <div
                  className={count === merchantCount ? "chart-active" : ""}
                  key={count}
                >
                  <span className="chart-value">{value}%</span>
                  <span
                    className="chart-bar"
                    style={{ height: `${Math.max(6, (value / 15) * 100)}%` }}
                  />
                  <small>{count}</small>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="merchant-directory" aria-labelledby="directory-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Registered issuers</span>
            <h2 id="directory-title">Merchant directory</h2>
          </div>
          <span className="source-note">
            <CheckCircle2 aria-hidden="true" size={13} />
            Authority checked on every issue
          </span>
        </div>

        {merchants.length === 0 ? (
          <EmptyState
            title="No registered merchants"
            detail="The directory will populate when a coalition authority registers its first merchant."
          />
        ) : (
          <div className="merchant-table" role="table" aria-label="Merchants">
            <div className="merchant-row merchant-header" role="row">
              <span role="columnheader">Merchant</span>
              <span role="columnheader">Rate</span>
              <span role="columnheader">Visits</span>
              <span role="columnheader">Issued</span>
              <span role="columnheader">State</span>
            </div>
            {merchants.map((merchant) => (
              <div className="merchant-row" role="row" key={merchant.id}>
                <div className="merchant-name" role="cell">
                  <span
                    className={`merchant-accent accent-${merchant.accent}`}
                  />
                  <span>
                    <strong>{merchant.name}</strong>
                    <small>{merchant.category}</small>
                  </span>
                </div>
                <span role="cell">{merchant.pointsPerUsdc} / USDC</span>
                <span role="cell">{merchant.visits}</span>
                <span role="cell">
                  {formatCompact(merchant.issuedPoints)}
                </span>
                <span role="cell">
                  <small
                    className={
                      merchant.active
                        ? "merchant-state active"
                        : "merchant-state"
                    }
                  >
                    {merchant.active ? "Active" : "Paused"}
                  </small>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
