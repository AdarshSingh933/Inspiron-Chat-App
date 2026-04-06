import { useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { loginWithAzure, logout } from "./auth/authService";
import Dashboard from "./pages/Dashboard/Dashboard";
import Login from "./pages/Login";
import "./index.css";

function App() {
  const { instance } = useMsal();
  const account = instance.getActiveAccount();

  useEffect(() => {
const handleRedirect = async () => {
  try {
    const response = await instance.handleRedirectPromise();

    if (response) {
      instance.setActiveAccount(response.account);

      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ["User.Read"],
        account: response.account,
      });

      const idToken = tokenResponse.idToken;

      if (!idToken) {
        throw new Error("❌ ID Token not received");
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/microsoft`, {
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
      console.log("data.user",data?.user);
      localStorage.setItem("user",JSON.stringify(data.user));

      console.log("🔥 Backend login success:", data);
    }
  } catch (err) {
    console.error("❌ Redirect handling error:", err);
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
    await logout(instance);
    localStorage.removeItem("appToken");
  };

  return (
    <div className="container">
      {account ? (
        <Dashboard username={account.username} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
