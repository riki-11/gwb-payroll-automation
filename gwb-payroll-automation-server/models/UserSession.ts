export interface UserSession {
    id: string;
    email: string;
    name: string;
    accessToken: string;
    refreshToken?: string;
    expiresOn: number; // timestamp when the token expires
    createdAt: number; // timestamp when the session was created
  }