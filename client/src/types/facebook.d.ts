declare global {
  interface Window {
    FB: {
      init: (params: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: {
            accessToken: string;
            userID: string;
          };
          status: string;
        }) => void,
        options?: { scope: string }
      ) => void;
      api: (
        path: string,
        params: { fields: string },
        callback: (response: {
          id: string;
          name: string;
          email?: string;
          picture?: {
            data: {
              url: string;
            };
          };
        }) => void
      ) => void;
    };
  }
}

export {};