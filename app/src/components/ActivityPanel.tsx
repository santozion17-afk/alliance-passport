import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  CircleDot,
  ExternalLink as ExternalLinkIcon,
  Fingerprint,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { APP_LINKS } from "../constants";
import { formatPoints, formatTimestamp } from "../lib/format";
import type { Activity, ActivityKind, Merchant } from "../types";
import { EmptyState, ExternalLink } from "./Ui";

const ACTIVITY_ICONS: Record<ActivityKind, LucideIcon> = {
  purchase: ArrowDownToLine,
  redemption: ArrowUpFromLine,
  tier: BadgeCheck,
  merchant: Store,
};

export function ActivityPanel({
  activity,
  merchants,
}: {
  activity: Activity[];
  merchants: Merchant[];
}) {
  return (
    <section className="activity-section" aria-labelledby="activity-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Receipt provenance</span>
          <h2 id="activity-title">Recent activity</h2>
        </div>
        <ExternalLink href={APP_LINKS.programActivity}>
          Program activity
        </ExternalLink>
      </div>

      {activity.length === 0 ? (
        <EmptyState
          title="No passport activity"
          detail="Verified purchases and redemptions will appear after the first receipt is recorded."
        />
      ) : (
        <div className="activity-table" role="table" aria-label="Recent activity">
          <div className="activity-row activity-header" role="row">
            <span role="columnheader">Event</span>
            <span role="columnheader">Provenance</span>
            <span role="columnheader">Points</span>
            <span role="columnheader">
              <span className="sr-only">Explorer</span>
            </span>
          </div>
          {activity.map((item) => {
            const Icon = ACTIVITY_ICONS[item.kind];
            const merchant = merchants.find(
              (candidate) => candidate.id === item.merchantId,
            );

            return (
              <div className="activity-row" role="row" key={item.id}>
                <div className="activity-event" role="cell">
                  <span className={`activity-icon activity-${item.kind}`}>
                    <Icon aria-hidden="true" size={16} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {merchant ? `${merchant.name} · ` : ""}
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                </div>
                <div className="activity-proof" role="cell">
                  {item.receiptHash ? (
                    <>
                      <Fingerprint aria-hidden="true" size={14} />
                      <span>{item.receiptHash}</span>
                    </>
                  ) : (
                    <>
                      <CircleDot aria-hidden="true" size={14} />
                      <span>Tier checkpoint</span>
                    </>
                  )}
                  {item.verified && <small>Verified</small>}
                </div>
                <span
                  className={`activity-points ${item.points > 0 ? "positive" : ""}`}
                  role="cell"
                >
                  {item.points === 0
                    ? "—"
                    : `${item.points > 0 ? "+" : ""}${formatPoints(item.points)}`}
                </span>
                <a
                  className="icon-button"
                  href={APP_LINKS.programActivity}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open provenance for ${item.title}`}
                  title="Open Devnet provenance"
                  role="cell"
                >
                  <ExternalLinkIcon aria-hidden="true" size={16} />
                </a>
                <p className="activity-detail">{item.detail}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
