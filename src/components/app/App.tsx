import React from "react";
import { theme } from "../../theme";
import Header from "./Header";
import SidePanel from "./SidePanel";
import Dashboard from "./Dashboard";
import Footer from "./Footer";



const App: React.FC = () => {
  return (
    <div
      style={{
        width: "100vw", // 100vw
        height: "100vh",
        position: "fixed", // fixed
        background: theme.colors.bg,
        color: theme.colors.text,
        fontFamily: theme.fonts.label,
        display: "flex",
        flexDirection: "column",
        
        // overflow: "auto",
      }}
    >
      <header
        style={{
          width: "100%",
          height: "25px",
          background: theme.colors.panel,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          color: theme.colors.accentBlue, // ✅ now from theme
          borderBottom: `1px solid ${theme.colors.grid}`,
          position: "relative",
        }}
      >
        <Header />
      </header>


      <div
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
        }}
      >
        <SidePanel />
        <main
          style={{
            flex: 1,
            background: theme.colors.bg,
            padding: theme.spacing.sm,
             minHeight: 0,          // 🔑 ensures Dashboard respects height
             
          }}
        >
          <Dashboard />
        </main>
      </div>

      <footer
        style={{
          width: "100%",
          height: "25px",
          background: theme.colors.panel,
          display: "flex",
          alignItems: "center",
          fontSize: 12,
          color: theme.colors.textDim,
          borderTop: `1px solid ${theme.colors.grid}`,
          justifyContent: "center",
        }}
      >
        <Footer />
      </footer>
    </div>
  );
};

export default App;
