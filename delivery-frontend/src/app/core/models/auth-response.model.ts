import {AuthUserData} from './auth-user-data.model';

export interface AuthResponse {
  message: string;
  data: AuthUserData;
  error: string | null;
}
