import React, { useEffect, useRef, useState } from "react";
import { theme } from "../../theme";
import { useLogStore } from "./logStore";
import { NotificationPanel } from "./NotificationPanel";

export const NotificationBell: React.FC = () => {
  const logs = useLogStore((s) => s.logs);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeCount = logs.filter(
    (l) => l.severity === "critical" || l.severity === "warning"
  ).length;

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications & Escalation"
        style={{
          position: "relative",
          padding: "3px 8px",
          fontSize: 14,
          lineHeight: 1,
          border: `1px solid ${theme.colors.grid}`,
          borderRadius: theme.radius.sm,
          background: theme.colors.bg,
          color: theme.colors.text,
          cursor: "pointer",
        }}
      >
        🔔
        {activeCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 15,
              height: 15,
              padding: "0 3px",
              borderRadius: 8,
              background: theme.colors.red,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {activeCount > 99 ? "99+" : activeCount}
          </span>
        )}
      </button>

      {/*
        NotificationPanel stays mounted at all times (only `visibility`
        toggles, never `display`/conditional render) so its escalation
        watcher keeps running while this dropdown is closed, and any
        auto-triggered EscalationModal (which overrides `visibility` on
        itself) can still pop up over the rest of the app.
      */}
      <div
        style={{
          visibility: open ? "visible" : "hidden",
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          width: 380,
          height: 460,
          zIndex: 60,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          borderRadius: theme.radius.sm,
        }}
      >
        <NotificationPanel logs={logs} />
      </div>
    </div>
  );
};

export default NotificationBell;
