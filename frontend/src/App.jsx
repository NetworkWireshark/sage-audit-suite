import DashboardPage from "./pages/DashboardPage";

const guestSession = {
  email: "admin@sage.local",
  role: "admin",
};

export default function App() {
  return (
    <DashboardPage
      session={guestSession}
      onLogout={() => window.location.reload()}
    />
  );
}
