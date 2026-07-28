import {
  CheckCircle2,
  Coins,
  LockKeyhole,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatDate, formatPoints } from "../lib/format";
import { getOfferAvailability } from "../lib/loyalty";
import type { Merchant, Offer, Passport } from "../types";
import { EmptyState } from "./Ui";

type OfferFilter = "all" | "available" | "locked";

interface OfferMarketProps {
  passport: Passport;
  merchants: Merchant[];
  offers: Offer[];
  onRedeem: (offer: Offer) => void;
}

export function OfferMarket({
  passport,
  merchants,
  offers,
  onRedeem,
}: OfferMarketProps) {
  const [filter, setFilter] = useState<OfferFilter>("all");
  const filteredOffers = useMemo(
    () =>
      offers.filter((offer) => {
        if (filter === "all") {
          return true;
        }
        const { available } = getOfferAvailability(passport, offer);
        return filter === "available" ? available : !available;
      }),
    [filter, offers, passport],
  );

  return (
    <section className="offers-section" aria-labelledby="offers-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Cross-merchant rewards</span>
          <h2 id="offers-title">Discover offers</h2>
        </div>
        <div className="segmented-control" aria-label="Filter offers">
          {(["all", "available", "locked"] as OfferFilter[]).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "all"
                ? "All"
                : value === "available"
                  ? "Ready"
                  : "Locked"}
            </button>
          ))}
        </div>
      </div>

      {filteredOffers.length === 0 ? (
        <EmptyState
          title={offers.length === 0 ? "No active offers" : "No matching offers"}
          detail={
            offers.length === 0
              ? "Merchant offers will appear after their PDAs are published."
              : "Try another filter or earn more points across the coalition."
          }
        />
      ) : (
        <div className="offer-grid">
          {filteredOffers.map((offer) => {
            const merchant = merchants.find(
              (candidate) => candidate.id === offer.merchantId,
            );
            const availability = getOfferAvailability(passport, offer);
            const remaining = offer.cap - offer.redeemed;

            return (
              <article className="offer-card" key={offer.id}>
                <div className="offer-card-top">
                  <span className="offer-label">{offer.label}</span>
                  {availability.available ? (
                    <span className="availability available">
                      <CheckCircle2 aria-hidden="true" size={14} />
                      Ready
                    </span>
                  ) : (
                    <span className="availability locked">
                      <LockKeyhole aria-hidden="true" size={14} />
                      Locked
                    </span>
                  )}
                </div>
                <div className="offer-merchant">
                  <span
                    className={`merchant-accent accent-${merchant?.accent ?? "green"}`}
                  />
                  {merchant?.name ?? "Coalition merchant"}
                </div>
                <h3>{offer.title}</h3>
                <p>{offer.description}</p>
                <dl className="offer-facts">
                  <div>
                    <dt>
                      <Coins aria-hidden="true" size={14} />
                      Cost
                    </dt>
                    <dd>{formatPoints(offer.pointsCost)}</dd>
                  </div>
                  <div>
                    <dt>
                      <Sparkles aria-hidden="true" size={14} />
                      Access
                    </dt>
                    <dd>{offer.minTier}</dd>
                  </div>
                  <div>
                    <dt>
                      <ShoppingBag aria-hidden="true" size={14} />
                      Left
                    </dt>
                    <dd>{remaining}</dd>
                  </div>
                </dl>
                <div className="offer-footer">
                  <span>Ends {formatDate(offer.expiresAt)}</span>
                  <button
                    className={
                      availability.available
                        ? "button button-primary"
                        : "button button-disabled"
                    }
                    type="button"
                    disabled={!availability.available}
                    onClick={() => onRedeem(offer)}
                  >
                    {availability.available
                      ? "Redeem"
                      : availability.reason}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
