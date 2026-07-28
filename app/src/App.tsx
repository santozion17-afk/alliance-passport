import {
  Boxes,
  CheckCircle2,
  ExternalLink,
  Github,
  LayoutDashboard,
  LoaderCircle,
  Network,
  RefreshCw,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { RedemptionDialog } from "./components/RedemptionDialog";
import {
  DataSourceNote,
  ErrorState,
  LoadingState,
} from "./components/Ui";
import {
  APP_LINKS,
  NETWORK_CONFIG,
  PROGRAM_ID,
  UI_TIMING,
} from "./constants";
import {
  SAMPLE_ACTIVITY,
  SAMPLE_MERCHANTS,
  SAMPLE_OFFERS,
  SAMPLE_PASSPORT,
} from "./data";
import { formatPoints, truncateAddress } from "./lib/format";
import type {
  Activity,
  DataState,
  Offer,
  Passport,
  ViewName,
} from "./types";
import { ArchitectureView } from "./views/ArchitectureView";
import { DashboardView } from "./views/DashboardView";
import { NetworkView } from "./views/NetworkView";

const NAV_ITEMS: Array<{
  id: ViewName;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "network", label: "Network", icon: Network },
  { id: "architecture", label: "Architecture", icon: Boxes },
];

function initialScenario(): "ready" | "error" | "empty" {
  const value = new URLSearchParams(window.location.search).get("state");
  return value === "error" || value === "empty" ? value : "ready";
}

export default function App() {
  const scenario = useMemo(initialScenario, []);
  const [activeView, setActiveView] = useState<ViewName>("dashboard");
  const [dataState, setDataState] = useState<DataState>(
    scenario === "error" ? "error" : "ready",
  );
  const [passport, setPassport] = useState<Passport>(SAMPLE_PASSPORT);
  const [offers, setOffers] = useState<Offer[]>(
    scenario === "empty" ? [] : SAMPLE_OFFERS,
  );
  const [activity, setActivity] = useState<Activity[]>(
    scenario === "empty" ? [] : SAMPLE_ACTIVITY,
  );
  const merchants = scenario === "empty" ? [] : SAMPLE_MERCHANTS;
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(
    merchants[0]?.id ?? null,
  );
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const syncTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);

  const syncSnapshot = useCallback(() => {
    if (syncTimer.current) {
      window.clearTimeout(syncTimer.current);
    }
    setDataState("loading");
    syncTimer.current = window.setTimeout(() => {
      setDataState("ready");
      setToast("Devnet preview refreshed");
      toastTimer.current = window.setTimeout(() => setToast(null), 2_800);
    }, UI_TIMING.syncMs);
  }, []);

  const handleRedeem = useCallback((offer: Offer) => {
    setPassport((current) => ({
      ...current,
      balance: current.balance - offer.pointsCost,
      lastActivity: new Date().toISOString(),
    }));
    setOffers((current) =>
      current.map((candidate) =>
        candidate.id === offer.id
          ? { ...candidate, redeemed: candidate.redeemed + 1 }
          : candidate,
      ),
    );
    setActivity((current) => [
      {
        id: `preview-${offer.id}-${Date.now()}`,
        kind: "redemption",
        merchantId: offer.merchantId,
        title: "Redemption preview created",
        detail: `${offer.title} · local Devnet simulation`,
        timestamp: new Date().toISOString(),
        points: -offer.pointsCost,
        receiptHash: `preview-${offer.id.toString(16).padStart(4, "0")}...local`,
        verified: false,
      },
      ...current,
    ]);
    setSelectedOffer(null);
    setToast(`${offer.title} reserved in preview state`);
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => setToast(null), 3_600);
  }, []);

  const selectedMerchant = merchants.find(
    (merchant) => merchant.id === selectedOffer?.merchantId,
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#main-content" aria-label="Alliance Passport">
          <span className="brand-mark" aria-hidden="true">
            AP
          </span>
          <span>
            <strong>Alliance Passport</strong>
            <small>Coalition console</small>
          </span>
        </a>

        <nav className="primary-nav" aria-label="Product views">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                aria-current={activeView === item.id ? "page" : undefined}
                onClick={() => setActiveView(item.id)}
              >
                <Icon aria-hidden="true" size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="header-actions">
          <div
            className="network-status"
            title="Sample data on Solana Devnet"
          >
            <span className="status-dot" />
            <span>
              <strong>Devnet</strong>
              <small>Preview state</small>
            </span>
          </div>
          <button
            className="icon-button header-icon"
            type="button"
            onClick={syncSnapshot}
            disabled={dataState === "loading"}
            aria-label="Refresh Devnet snapshot"
            title="Refresh Devnet snapshot"
          >
            {dataState === "loading" ? (
              <LoaderCircle className="spin" aria-hidden="true" size={17} />
            ) : (
              <RefreshCw aria-hidden="true" size={17} />
            )}
          </button>
          <a
            className="icon-button header-icon"
            href={APP_LINKS.repository}
            target="_blank"
            rel="noreferrer"
            aria-label="Open GitHub repository"
            title="Open GitHub repository"
          >
            <Github aria-hidden="true" size={18} />
          </a>
        </div>
      </header>

      <div className="devnet-banner" role="status">
        <ShieldCheck aria-hidden="true" size={15} />
        <span>
          <strong>{NETWORK_CONFIG.label}</strong>
          Interface demo with sample account state. No wallet is connected and
          no transaction will be signed.
        </span>
        <a href={APP_LINKS.programExplorer} target="_blank" rel="noreferrer">
          Program
          <ExternalLink aria-hidden="true" size={13} />
        </a>
      </div>

      <main id="main-content" className="app-main">
        {dataState === "loading" ? (
          <LoadingState />
        ) : dataState === "error" ? (
          <ErrorState onRetry={syncSnapshot} />
        ) : activeView === "dashboard" ? (
          <DashboardView
            passport={passport}
            merchants={merchants}
            offers={offers}
            activity={activity}
            selectedMerchantId={selectedMerchantId}
            onSelectMerchant={setSelectedMerchantId}
            onRedeem={setSelectedOffer}
          />
        ) : activeView === "network" ? (
          <NetworkView merchants={merchants} passport={passport} />
        ) : (
          <ArchitectureView />
        )}
      </main>

      <footer className="app-footer">
        <div>
          <span className="footer-status">
            <Wifi aria-hidden="true" size={14} />
            {NETWORK_CONFIG.rpcLabel}
          </span>
          <DataSourceNote />
        </div>
        <div>
          <span>
            Program{" "}
            <code title={PROGRAM_ID}>
              {truncateAddress(PROGRAM_ID, 5, 5)}
            </code>
          </span>
          <span>Balance {formatPoints(passport.balance)} AP</span>
        </div>
      </footer>

      <RedemptionDialog
        offer={selectedOffer}
        merchant={selectedMerchant}
        passport={passport}
        onClose={() => setSelectedOffer(null)}
        onConfirm={handleRedeem}
      />

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <CheckCircle2 aria-hidden="true" size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
