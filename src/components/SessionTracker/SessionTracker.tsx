import React, { useEffect, useState } from "react";
import { theme } from "../../theme";
import { getActiveSession, getNextSession, type Session } from "./sessionUtils";

interface Props {
  brokerOffset?: number;
}

const sessions: Session[] = [
  { name: "Sydney",   start: 1,  end: 10, gradient: "linear-gradient(90deg,#4fc3f7,#0288d1)", glow: "#4fc3f7" },
  { name: "Tokyo",    start: 3,  end: 12, gradient: "linear-gradient(90deg,#81c784,#388e3c)", glow: "#81c784" },
  { name: "London",   start: 10, end: 19, gradient: "linear-gradient(90deg,#ffb74d,#f57c00)", glow: "#ffb74d" },
  { name: "New York", start: 16, end: 1,  gradient: "linear-gradient(90deg,#e57373,#c62828)", glow: "#e57373" },
  { name: "Crypto",   start: 1,  end: 1,  gradient: "linear-gradient(90deg,#e639d7ff,#f540e6ff)", glow: "#e639d7ff" }
];

const anchorHour = 1;

const SessionTracker: React.FC<Props> = ({ brokerOffset = 4 }) => {
  const [currentHour, setCurrentHour] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const brokerHours = (now.getUTCHours() + brokerOffset + 24) % 24;
      const brokerMinutes = now.getUTCMinutes();
      const brokerSeconds = now.getUTCSeconds();
      const fractionalHour = brokerHours + brokerMinutes / 60 + brokerSeconds / 3600;
      setCurrentHour(fractionalHour);
      setCurrentTimeStr(`${brokerHours.toString().padStart(2, "0")}:${brokerMinutes.toString().padStart(2, "0")}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [brokerOffset]);

  const hourToPercent = (hour: number) => ((hour - anchorHour + 24) % 24) / 24 * 100;

  const activeSession = getActiveSession(sessions, currentHour);
  const nextSession = getNextSession(sessions, currentHour);
  const nextInHours = nextSession ? ((nextSession.start - currentHour + 24) % 24).toFixed(2) : null;

  return (
    <div style={{
      position: "relative",
      height: 100,
      background: theme.colors.panel,
      border: `1px solid ${theme.colors.grid}`,
      borderRadius: theme.radius.sm,
      padding: theme.spacing.sm
    }}>
      {/* Current time marker */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 2,
          left: `${hourToPercent(currentHour)}%`,
          borderLeft: `2px solid ${activeSession?.glow || theme.colors.accentBlue}`,
          boxShadow: `0 0 8px ${activeSession?.glow || theme.colors.accentBlue}`
        }}
      >
        <span
          title={`Active: ${activeSession?.name ?? "None"}`}
          style={{
            position: "absolute",
            top: -18,
            left: -15,
            fontSize: 12,
            color: theme.colors.text
          }}
        >
          {currentTimeStr}
        </span>
      </div>

      {/* Session bars */}
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
        {sessions.map((s, i) => {
          const startPct = hourToPercent(s.start);
          const endPct = hourToPercent(s.end);
          const totalWidth = s.start < s.end ? endPct - startPct : 100 - startPct + endPct;
          let elapsedWidth = 0;
          let isActive = false;

          if (s.start < s.end) {
            if (currentHour >= s.start && currentHour < s.end) {
              isActive = true;
              elapsedWidth = totalWidth * ((currentHour - s.start) / (s.end - s.start));
            } else if (currentHour >= s.end) {
              elapsedWidth = totalWidth;
            }
          } else {
            if (currentHour >= s.start || currentHour < s.end) {
              isActive = true;
              const hoursPassed = currentHour >= s.start ? currentHour - s.start : 24 - s.start + currentHour;
              const totalHours = 24 - s.start + s.end;
              elapsedWidth = totalWidth * (hoursPassed / totalHours);
            } else {
              elapsedWidth = totalWidth;
            }
          }

          return (
            <div key={i} style={{ position: "relative", height: 16 }}>
              {/* Session label above bar */}
              <div style={{
                position: "absolute",
                left: `${startPct}%`,
                top: -2,
                fontSize: 10,
                fontWeight: 500,
                color: theme.colors.text,
                zIndex: 2,
              }}>
                {s.name}
              </div>

              {/* Full colored bar */}
              <div
                style={{
                  position: "absolute",
                  left: `${startPct}%`,
                  width: `${totalWidth}%`,
                  height: "100%",
                  background: s.gradient,
                  boxShadow: isActive ? `0 0 10px ${s.glow}` : "none",
                  opacity: currentHour < s.start && s.start < s.end ? 0.3 : 1,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 4,
                  fontSize: 10,
                  color: theme.colors.text,
                  fontWeight: 500
                }}
              >
                {/* Pre‑open state */}
                {currentHour < s.start && s.start < s.end && (
                  <span style={{ marginLeft: 6, fontSize: 9, color: theme.colors.textDim }}>
                    NOT OPEN
                  </span>
                )}

                {/* Closed state */}
                {elapsedWidth >= totalWidth && (
                  <span style={{ marginLeft: 6, fontSize: 9, color: theme.colors.textDim }}>
                    CLOSED
                  </span>
                )}
              </div>

              {/* Grey overlay */}
              <div
                style={{
                  position: "absolute",
                  left: `${startPct}%`,
                  width: `${elapsedWidth}%`,
                  height: "100%",
                  background: elapsedWidth >= totalWidth ? "rgba(30,30,30,0.9)" : "rgba(30,30,30,0.6)",
                  borderRadius: 2
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Next session countdown */}
      {nextSession && (
        <div style={{
          marginTop: theme.spacing.xs,
          fontSize: 11,
          color: theme.colors.textDim,
          textAlign: "center"
        }}>
          Next session: {nextSession.name} in {nextInHours}h
        </div>
      )}
    </div>
  );
};

export default SessionTracker;
