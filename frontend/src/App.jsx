import { useMemo, useState } from "react";
import { currentUser, logout } from "./lib/api";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";

export default function App() {
  const [session, setSession] = useState(() => currentUser());
  const authState = useMemo(() => ({ session, setSession }), [session]);

  if (!session) {
    return <LoginPage onAuthenticated={setSession} />;
  }

  return (
    <DashboardPage
      session={authState.session}
      onLogout={() => {
        logout();
        setSession(null);
      }}
    />
  );
}
