import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Binary,
  Blocks,
  CheckCircle2,
  CircleDollarSign,
  Code2,
  FileCheck2,
  Fingerprint,
  KeyRound,
  Receipt,
  ShieldCheck,
  Store,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { APP_LINKS, NETWORK_CONFIG, PROGRAM_ID } from "../constants";
import { deriveDemoPdas } from "../lib/pda";
import { truncateAddress } from "../lib/format";
import { CopyButton, ExternalLink } from "../components/Ui";

const pdaRecords = deriveDemoPdas();

export function ArchitectureView() {
  return (
    <div className="view-stack">
      <div className="view-heading">
        <div>
          <span className="eyebrow">Protocol inspector</span>
          <h1>On-chain architecture</h1>
          <p>
            Deterministic accounts isolate authority, prevent receipt replay, and
            make every balance change independently auditable.
          </p>
        </div>
        <div className="view-context architecture-context">
          <Blocks aria-hidden="true" size={18} />
          <span>
            <strong>{NETWORK_CONFIG.label}</strong>
            {NETWORK_CONFIG.deploymentState}
          </span>
        </div>
      </div>

      <section className="protocol-flow" aria-labelledby="flow-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Purchase to redemption</span>
            <h2 id="flow-title">State transition flow</h2>
          </div>
          <span className="source-note">
            <ShieldCheck aria-hidden="true" size={13} />
            Authority-gated instructions
          </span>
        </div>

        <div className="flow-track">
          <FlowNode
            icon={KeyRound}
            label="Merchant authority"
            detail="Signs purchase"
            tone="green"
          />
          <FlowArrow />
          <FlowNode
            icon={Receipt}
            label="Receipt PDA"
            detail="Consumes hash once"
            tone="coral"
          />
          <FlowArrow />
          <FlowNode
            icon={WalletCards}
            label="Passport PDA"
            detail="Credits shared points"
            tone="gold"
          />
          <FlowArrow />
          <FlowNode
            icon={Store}
            label="Offer PDA"
            detail="Checks tier + cap"
            tone="teal"
          />
          <FlowArrow />
          <FlowNode
            icon={FileCheck2}
            label="Redemption PDA"
            detail="Records spend"
            tone="green"
          />
        </div>
      </section>

      <section className="pda-section" aria-labelledby="pda-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Deterministic derivation</span>
            <h2 id="pda-title">Program-derived accounts</h2>
          </div>
          <div className="program-id">
            <span>Program</span>
            <code title={PROGRAM_ID}>{truncateAddress(PROGRAM_ID, 7, 7)}</code>
            <CopyButton value={PROGRAM_ID} label="program ID" />
          </div>
        </div>

        <div className="pda-table" role="table" aria-label="Derived accounts">
          <div className="pda-row pda-header" role="row">
            <span role="columnheader">Account</span>
            <span role="columnheader">Seeds</span>
            <span role="columnheader">Derived address</span>
            <span role="columnheader">Purpose</span>
          </div>
          {pdaRecords.map((record) => (
            <div className="pda-row" role="row" key={record.account}>
              <div className="pda-account" role="cell">
                <Binary aria-hidden="true" size={15} />
                <span>
                  <strong>{record.account}</strong>
                  <small>bump {record.bump}</small>
                </span>
              </div>
              <code role="cell">{record.seeds}</code>
              <div className="pda-address" role="cell">
                <code title={record.address}>
                  {truncateAddress(record.address, 6, 6)}
                </code>
                <CopyButton
                  value={record.address}
                  label={`${record.account} address`}
                />
              </div>
              <span role="cell">{record.purpose}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="token-section" aria-labelledby="token-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Achievement credentials</span>
            <h2 id="token-title">Token-2022 badge flow</h2>
          </div>
          <ExternalLink href={APP_LINKS.token2022Docs}>
            Extension docs
          </ExternalLink>
        </div>

        <div className="token-flow">
          <div>
            <span className="token-step-icon token-gold">
              <CircleDollarSign aria-hidden="true" size={18} />
            </span>
            <strong>Tier threshold</strong>
            <span>Lifetime points satisfy the configured tier.</span>
          </div>
          <ArrowDown className="mobile-flow-arrow" aria-hidden="true" size={18} />
          <ArrowRight
            className="desktop-flow-arrow"
            aria-hidden="true"
            size={18}
          />
          <div>
            <span className="token-step-icon token-coral">
              <Fingerprint aria-hidden="true" size={18} />
            </span>
            <strong>BadgeConfig PDA</strong>
            <span>Coalition binds one Token-2022 mint to the tier.</span>
          </div>
          <ArrowDown className="mobile-flow-arrow" aria-hidden="true" size={18} />
          <ArrowRight
            className="desktop-flow-arrow"
            aria-hidden="true"
            size={18}
          />
          <div>
            <span className="token-step-icon token-teal">
              <BadgeCheck aria-hidden="true" size={18} />
            </span>
            <strong>NonTransferable mint</strong>
            <span>One achievement token is minted to the member ATA.</span>
          </div>
          <ArrowDown className="mobile-flow-arrow" aria-hidden="true" size={18} />
          <ArrowRight
            className="desktop-flow-arrow"
            aria-hidden="true"
            size={18}
          />
          <div>
            <span className="token-step-icon token-green">
              <CheckCircle2 aria-hidden="true" size={18} />
            </span>
            <strong>BadgeClaim PDA</strong>
            <span>Claim state prevents duplicate credentials.</span>
          </div>
        </div>
      </section>

      <section className="resource-band" aria-label="Project resources">
        <div>
          <Code2 aria-hidden="true" size={18} />
          <span>
            <strong>Public implementation</strong>
            Review the program, tests, and Devnet account activity.
          </span>
        </div>
        <div className="resource-links">
          <ExternalLink href={APP_LINKS.repository}>
            Repository
          </ExternalLink>
          <ExternalLink href={APP_LINKS.tests}>Program tests</ExternalLink>
          <ExternalLink href={APP_LINKS.programExplorer}>
            Devnet explorer
          </ExternalLink>
        </div>
      </section>
    </div>
  );
}

function FlowNode({
  icon: Icon,
  label,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  tone: "green" | "coral" | "gold" | "teal";
}) {
  return (
    <div className="flow-node">
      <span className={`flow-icon flow-${tone}`}>
        <Icon aria-hidden="true" size={18} />
      </span>
      <strong>{label}</strong>
      <span>{detail}</span>
    </div>
  );
}

function FlowArrow() {
  return (
    <span className="flow-arrow" aria-hidden="true">
      <ArrowRight size={17} />
    </span>
  );
}
