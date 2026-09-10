import React, { useEffect, useRef, useState } from "react";
import { theme } from "../theme";
import AccInfo from "./AccInfo";

export const AccountMenu: React.FC<{ account: Record<string, any> | null }> = ({ account }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div ref={containerRef} style={{ position: "relative", fontSize: 12 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "3px 10px",
          border: `1px solid ${theme.colors.grid}`,
          borderRadius: theme.radius.sm,
          background: theme.colors.bg,
          color: theme.colors.text,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Account ▾
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 320,
            background: theme.colors.panel,
            border: `1px solid ${theme.colors.grid}`,
            borderRadius: theme.radius.sm,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 60,
            padding: theme.spacing.sm,
          }}
        >
          <AccInfo account={account} />
        </div>
      )}
    </div>
  );
};

export default AccountMenu;
