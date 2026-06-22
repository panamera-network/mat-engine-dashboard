import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { theme } from "../../theme";
import Header from "./Header";
import SidePanel from "./SidePanel";
import Dashboard from "./Dashboard";
import Footer from "./Footer";

function AppErrorFallback({ error }: { error: Error }) {
  return (
    <div
      style={{
        padding: theme.spacing.lg,
        color: theme.colors.red,
        background: theme.colors.bg,
        height: "100vh",
      }}
    >
      <h2>Something went wrong</h2>
      <pre style={{ color: theme.colors.textDim, fontSize: 13 }}>{error.message}</pre>
    </div>
  );
}

const App: React.FC = () => {
  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback}>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          position: "fixed",
          background: theme.colors.bg,
          color: theme.colors.text,
          fontFamily: theme.fonts.label,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Header />

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <SidePanel />
          <main
            style={{
              flex: 1,
              background: theme.colors.bg,
              padding: theme.spacing.sm,
              minHeight: 0,
            }}
          >
            <Dashboard />
          </main>
        </div>

        <Footer />
      </div>
    </ErrorBoundary>
  );
};

export default App;
