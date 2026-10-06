export type Role = 'Admin' | 'Manager' | 'Viewer';

/** The `/bff/user` response. The app never sees a token, only this profile. */
export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
}
