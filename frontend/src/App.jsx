import { useEffect, useMemo, useState } from "react";
import { AUTH_EXPIRED_EVENT, currentUser, fetchCurrentUser, logout } from "./lib/api";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";

export default function App() {
  const [session, setSession] = useState(() => currentUser());
  const authState = useMemo(() => ({ session, setSession }), [session]);

  useEffect(() => {
    function handleAuthExpired() {
      setSession(null);
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  useEffect(() => {
    let ignore = false;

    if (session) {
      fetchCurrentUser()
        .then((user) => {
          if (!ignore) {
            setSession({ email: user.email, role: user.role });
          }
        })
        .catch(() => {
          // 401 responses are handled by the API interceptor; network errors keep the local session visible.
        });
    }

    return () => {
      ignore = true;
    };
  }, [session?.email]);

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
