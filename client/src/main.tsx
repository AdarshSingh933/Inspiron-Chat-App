import ReactDOM from "react-dom/client";
import App from "./App";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./auth/msalClient";

const startApp = async () => {
   await msalInstance.initialize();

  const response = await msalInstance.handleRedirectPromise();

  if (response) {
    console.log("✅ Login response:", response);

    msalInstance.setActiveAccount(response.account);
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  );
};

startApp();