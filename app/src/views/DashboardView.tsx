import {
  BadgeCheck,
  Fingerprint,
  Network,
  ReceiptText,
} from "lucide-react";
import { calculateNetworkMultiplier } from "../lib/loyalty";
import { formatPoints } from "../lib/format";
import type { Activity, Merchant, Offer, Passport } from "../types";
import { ActivityPanel } from "../components/ActivityPanel";
import { NetworkMap } from "../components/NetworkMap";
import { OfferMarket } from "../components/OfferMarket";
import { PassportPanel } from "../components/PassportPanel";

interface DashboardViewProps {
  passport: Passport;
  merchants: Merchant[];
  offers: Offer[];
  activity: Activity[];
  selectedMerchantId: string | null;
  onSelectMerchant: (merchantId: string) => void;
  onRedeem: (offer: Offer) => void;
}

export function DashboardView({
  passport,
  merchants,
  offers,
  activity,
  selectedMerchantId,
  onSelectMerchant,
  onRedeem,
}: DashboardViewProps) {
  const multiplier = calculateNetworkMultiplier(passport.uniqueMerchants);
  const verifiedReceipts = activity.filter(
    (item) => item.verified && item.receiptHash,
  ).length;

  return (
    <div className="view-stack">
      <div className="view-heading">
        <div>
          <span className="eyebrow">Coalition operations</span>
          <h1>Member dashboard</h1>
          <p>
            One balance across independent merchants, with every earn and
            redemption traceable to a program-derived account.
          </p>
        </div>
        <div className="view-context">
          <BadgeCheck aria-hidden="true" size={18} />
          <span>
            <strong>Receipt replay protection</strong>
            One hash, one merchant, one use
          </span>
        </div>
      </div>

      <section className="summary-strip" aria-label="Passport summary">
        <div>
          <span className="summary-icon summary-green">
            <Fingerprint aria-hidden="true" size={17} />
          </span>
          <span>
            <small>Shared balance</small>
            <strong>{formatPoints(passport.balance)} points</strong>
          </span>
        </div>
        <div>
          <span className="summary-icon summary-gold">
            <Network aria-hidden="true" size={17} />
          </span>
          <span>
            <small>Network bonus</small>
            <strong>+{multiplier}% per purchase</strong>
          </span>
        </div>
        <div>
          <span className="summary-icon summary-coral">
            <ReceiptText aria-hidden="true" size={17} />
          </span>
          <span>
            <small>Verified receipts</small>
            <strong>{verifiedReceipts} in this snapshot</strong>
          </span>
        </div>
        <div>
          <span className="summary-icon summary-teal">
            <BadgeCheck aria-hidden="true" size={17} />
          </span>
          <span>
            <small>Tier credential</small>
            <strong>{passport.tier} · badge eligible</strong>
          </span>
        </div>
      </section>

      <div className="dashboard-grid">
        <PassportPanel passport={passport} />
        <NetworkMap
          merchants={merchants}
          selectedId={selectedMerchantId}
          onSelect={onSelectMerchant}
        />
      </div>

      <OfferMarket
        passport={passport}
        merchants={merchants}
        offers={offers}
        onRedeem={onRedeem}
      />

      <ActivityPanel activity={activity} merchants={merchants} />
    </div>
  );
}
