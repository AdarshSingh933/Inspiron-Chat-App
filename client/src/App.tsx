import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginWithAzure, logout } from "./auth/authService";
import Dashboard from "./pages/Dashboard/Dashboard";
import Login from "./pages/Login";
import "./index.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

const clearStoredUser = () => {
  localStorage.removeItem("appToken");
  localStorage.removeItem("user");
};

function App() {
  const { instance } = useMsal();
  const account = instance.getActiveAccount() || instance.getAllAccounts()[0];
  const [appUser, setAppUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const syncBackendUser = async (activeAccount: any) => {
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ["User.Read"],
        account: activeAccount,
      });

      const idToken = tokenResponse.idToken;

      if (!idToken) {
        throw new Error("❌ ID Token not received");
      }

      const res = await fetch(`${API_BASE_URL}/auth/microsoft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: idToken }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Backend error: ${errorText}`);
      }

      const data = await res.json();

      localStorage.setItem("appToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setAppUser(data.user);
    };

    const handleRedirect = async () => {
      try {
        const response = await instance.handleRedirectPromise();

        if (response?.account) {
          instance.setActiveAccount(response.account);
        }

        const activeAccount =
          instance.getActiveAccount() || instance.getAllAccounts()[0];

        if (!activeAccount) {
          clearStoredUser();
          setAppUser(null);
          return;
        }

        instance.setActiveAccount(activeAccount);
        await syncBackendUser(activeAccount);
      } catch (err) {
        console.error("❌ Redirect handling error:", err);
        clearStoredUser();
        setAppUser(null);
      } finally {
        setAuthReady(true);
      }
    };

    handleRedirect();
  }, [instance]);

  const handleLogin = async () => {
    try {
      await loginWithAzure(instance);
    } catch (err) {
      console.error("handle login error", err);
    }
  };

  const handleLogout = async () => {
    clearStoredUser();
    setAppUser(null);
    await logout(instance);
  };

  if (!authReady) {
    return null;
  }

  if (account && appUser) {
    return <Dashboard currentUser={appUser} onLogout={handleLogout} />;
  }

  return (
    <div className="login-page">
      <Login onLogin={handleLogin} />
    </div>
  );
}

export default App;
