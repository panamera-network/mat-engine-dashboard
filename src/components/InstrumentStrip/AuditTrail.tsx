// src/components/AuditTrail.tsx
import React from 'react';
import { theme } from '../../theme';
import { Panel } from '../../ui/Panel';

export type AuditEvent = {
  ts: string;
  level: 'High' | 'Medium' | 'Low';
  value: number;
  escalations?: ('badge' | 'push' | 'slack' | 'voice')[];
};

interface AuditTrailProps {
  events: AuditEvent[];
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ events }) => {
  return (
    <Panel title="Audit trail" style={{ width: '100%' }}>
      <div style={{ display: 'grid', gap: theme.spacing.xs }}>
        {events.slice(0, 5).map((e, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: theme.colors.panelAlt,
              borderRadius: theme.radius.sm,
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: `1px solid ${theme.colors.grid}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
              <span style={{ color: theme.colors.textDim, fontFamily: theme.fonts.label }}>{e.ts}</span>
              <span
                style={{
                  fontFamily: theme.fonts.label,
                  color:
                    e.level === 'High'
                      ? theme.colors.red
                      : e.level === 'Medium'
                      ? theme.colors.amber
                      : theme.colors.green,
                  fontWeight: 700,
                }}
              >
                {e.level}
              </span>
              <span style={{ color: theme.colors.text, opacity: 0.8 }}>Vol {e.value}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(e.escalations || []).map((m, idx) => (
                <span
                  key={idx}
                  title={m}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background:
                      m === 'badge'
                        ? theme.colors.green
                        : m === 'push'
                        ? theme.colors.amber
                        : m === 'slack'
                        ? '#709cff'
                        : theme.colors.red,
                    boxShadow: `0 0 10px ${theme.colors.glow}`,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
};
