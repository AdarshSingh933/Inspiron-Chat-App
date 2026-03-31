
import {
  type Configuration,LogLevel,
  PublicClientApplication
} from "@azure/msal-browser";

const msalConfig: Configuration = {
  auth: {
    clientId:  import.meta.env.VITE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${ import.meta.env.VITE_TENANT_ID}`,
    redirectUri:  import.meta.env.VITE_REDIRECT_URI,
    postLogoutRedirectUri:  import.meta.env.VITE_REDIRECT_URI,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
   system: {	
        loggerOptions: {	
            loggerCallback: (level, message, containsPii) => {	
                if (containsPii) {		
                    return;		
                }		
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        return;
                    case LogLevel.Info:
                        console.info(message);
                        return;
                    case LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
                        return;
                    default:
                        return;
                }	
            }	
        }	
    }
};

export const msalInstance = new PublicClientApplication(msalConfig);