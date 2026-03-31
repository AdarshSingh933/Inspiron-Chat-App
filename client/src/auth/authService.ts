
import { loginRequest } from "./authConfig";
export const loginWithAzure = async (msalInstance: any, email?: string) => {
  try {
     await msalInstance.loginRedirect({
      ...loginRequest,
      loginHint: email,
      prompt: "select_account",
    });
  
  } catch (error) {
    console.log("error in login",error);
    throw error;
  }
}

export const getAccessToken = async (msalInstance:any) => {
  try {
    const account = msalInstance.getActiveAccount();

    if (!account) return null;

    const response = await msalInstance.acquireTokenSilent({
      scopes: loginRequest.scopes,
      account,
    });

    return response.accessToken;
  } catch (error: any) {
    if (error.errorCode === "interaction_required") {
      return null;
    }
    throw error;
  }
};

export const logout = async (msalInstance:any) => {
  await msalInstance.logoutRedirect();
};