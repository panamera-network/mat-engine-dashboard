//footer.tsx
import React from "react";
import { theme } from "../../theme";

const Footer: React.FC = () => {
  return (
    <footer
      style={{
        width: "100%",
        height: "25px",
        background: theme.colors.panel,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        color: theme.colors.textDim,
        borderTop: `1px solid ${theme.colors.grid}`,
      }}
    >
      <div style={{ fontWeight: 400 }}>© 2025 Mat‑AI Engine</div>
    </footer>
  );
};

export default Footer;
