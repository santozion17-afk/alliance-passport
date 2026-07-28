import {
  Bike,
  Building2,
  Coffee,
  MapPin,
  Network,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { calculateNetworkMultiplier } from "../lib/loyalty";
import type { Merchant, MerchantCategory } from "../types";

const CATEGORY_ICONS: Record<MerchantCategory, LucideIcon> = {
  Mobility: Bike,
  Hospitality: Building2,
  Food: Coffee,
  Workspace: Store,
};

interface NetworkMapProps {
  merchants: Merchant[];
  selectedId: string | null;
  onSelect: (merchantId: string) => void;
}

export function NetworkMap({
  merchants,
  selectedId,
  onSelect,
}: NetworkMapProps) {
  const selected =
    merchants.find((merchant) => merchant.id === selectedId) ?? merchants[0];
  const multiplier = calculateNetworkMultiplier(merchants.length);

  return (
    <section className="panel network-panel" aria-labelledby="network-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Coalition graph</span>
          <h2 id="network-title">Merchant network</h2>
        </div>
        <span className="network-bonus">
          <Network aria-hidden="true" size={15} />
          +{multiplier}% bonus
        </span>
      </div>

      {merchants.length === 0 ? (
        <div className="network-empty">
          <MapPin aria-hidden="true" size={22} />
          <strong>No merchants enrolled</strong>
          <span>Registered merchant PDAs will appear here.</span>
        </div>
      ) : (
        <>
          <div className="network-map" aria-label="Coalition merchant map">
            <svg
              className="network-lines"
              viewBox="0 0 400 230"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line x1="200" y1="115" x2="70" y2="48" />
              <line x1="200" y1="115" x2="330" y2="48" />
              <line x1="200" y1="115" x2="70" y2="188" />
              <line x1="200" y1="115" x2="330" y2="188" />
            </svg>
            <div className="network-hub">
              <span>AP</span>
              <small>Passport</small>
            </div>
            {merchants.slice(0, 4).map((merchant, index) => {
              const Icon = CATEGORY_ICONS[merchant.category];
              return (
                <button
                  className={`merchant-node node-${index} accent-${merchant.accent}`}
                  type="button"
                  key={merchant.id}
                  aria-pressed={selected?.id === merchant.id}
                  onClick={() => onSelect(merchant.id)}
                >
                  <Icon aria-hidden="true" size={17} />
                  <span>{merchant.shortName}</span>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="network-detail" aria-live="polite">
              <span className={`merchant-accent accent-${selected.accent}`} />
              <div>
                <strong>{selected.name}</strong>
                <span>
                  {selected.category} · {selected.pointsPerUsdc} points/USDC
                </span>
              </div>
              <div>
                <strong>{selected.visits}</strong>
                <span>visits</span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
