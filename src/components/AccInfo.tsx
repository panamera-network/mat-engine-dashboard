// components/AccInfo.tsx
import React from "react";
import { theme } from "../theme";


interface AccInfoProps {
  account: Record<string, any> | null;
}

interface MetricProps {
  label: string;
  value: string | number;
  color?: string;
  pulse?: boolean;
  tooltip?: string;
}

const Metric: React.FC<MetricProps> = ({ label, value, color = theme.colors.text, pulse = false, tooltip }) => (
  <div style={{ display: "flex", flexDirection: "column" }} title={tooltip}>
    <span style={{
      fontSize: "0.75rem",
      color: theme.colors.textDim,
      marginBottom: "0.25rem",
      fontFamily: theme.fonts.label,
    }}>
      {label}
    </span>
    <span style={{
      fontFamily: "monospace",
      fontSize: "0.875rem",
      fontWeight: 600,
      color,
      animation: pulse ? "pulse 1.5s infinite ease-in-out" : undefined,
    }}>
      {value}
    </span>
  </div>
);

const AccInfo: React.FC<AccInfoProps> = ({ account }) => {
  if (!account || typeof account !== "object") {
    return (
      <div style={{ color: theme.colors.textDim, fontStyle: "italic" }}>
        No account data available
      </div>
    );
  }

  const currency = account.currency ?? "";
  const format = (n?: number) => n?.toFixed(2) ?? "0.00";

  const balance = account.balance ?? 0;
  const equity = account.equity ?? 0;
  const marginFree = account.margin_free ?? 0;
  const marginUsed = account.margin ?? 0;
  const profit = account.profit ?? 0;
  const leverage = account.leverage ?? "N/A";
  const broker = account.company ?? "Unknown";

  const marginRatio = equity > 0 ? marginFree / equity : 0;
  const isMarginCritical = marginRatio < 0.2;
  const isProfitNegative = profit < 0;
  const profitTrend = profit > 0 ? "📈" : profit < 0 ? "📉" : "➖";

  return (
    <div style={{
      background: isMarginCritical ? `${theme.colors.red}20` : "transparent", // soft red tint
      borderRadius: theme.radius.sm,
      padding: theme.spacing.sm,
      boxShadow: isMarginCritical ? `0 0 0 2px ${theme.colors.red}` : undefined,
    }}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: theme.spacing.sm,
      }}>
        <Metric label="Broker" value={broker} />
        <Metric label="Account ID" value={account.login?.toString() ?? "N/A"} />
        <Metric label="Currency" value={currency} />
        <Metric label="Balance" value={`${format(balance)} ${currency}`} />
        <Metric label="Equity" value={`${format(equity)} ${currency}`} pulse />
        <Metric
          label="Free Margin"
          value={`${format(marginFree)} ${currency}`}
          color={isMarginCritical ? theme.colors.red : theme.colors.green}
          pulse={isMarginCritical}
          tooltip="Available funds for new positions. Drops below 20% triggers warning."
        />
        <Metric
          label="Used Margin"
          value={`${format(marginUsed)} ${currency}`}
          color={marginUsed > 0 ? theme.colors.amber : theme.colors.text}
        />
        <Metric
          label="Leverage"
          value={`1:${leverage}`}
          tooltip="Leverage ratio determines exposure vs capital. 1:500 means $1 controls $500."
        />
        <Metric
          label="Profit"
          value={`${format(profit)} ${currency} ${profitTrend}`}
          color={isProfitNegative ? theme.colors.red : theme.colors.green}
        />
      </div>
    </div>
  );
};

export default AccInfo;
