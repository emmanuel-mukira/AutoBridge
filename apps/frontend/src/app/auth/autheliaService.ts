/**
 * Authelia API Service
 * 
 * Handles direct integration with Authelia APIs for custom frontend authentication.
 * Supports email 2FA, password reset, and user invitations.
 */

import { http } from '@/lib/http';

export interface AutheliaLoginRequest {
  username: string;
  password: string;
  keepMeLoggedIn?: boolean;
}

export interface AutheliaOTPRequest {
  token: string;
}

export interface AutheliaOTPValidate {
  token: string;
  code: string;
}

export interface AutheliaPasswordReset {
  username: string;
}

export interface AutheliaUserInfo {
  displayName: string;
  username: string;
  email: string;
  groups: string[];
}

export interface AutheliaResponse {
  status: string;
  data?: Record<string, unknown>;
}

class AutheliaService {
  private baseUrl: string;

  constructor() {
    // Direct to Authelia for API calls, not through our proxy
    this.baseUrl = import.meta.env.VITE_AUTHELIA_URL || 'http://127.0.0.1:9091';
  }

  /**
   * Step 1: Validate username/password
   * Returns a token for 2FA if successful
   */
  async loginFirstFactor(credentials: AutheliaLoginRequest): Promise<AutheliaResponse> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', credentials.username);
      formData.append('password', credentials.password);
      if (credentials.keepMeLoggedIn) {
        formData.append('keep_me_logged_in', 'true');
      }

      const response = await http.post<AutheliaResponse>(`${this.baseUrl}/api/firstfactor`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        withCredentials: true, // Important for session cookies
      });

      return response.data;
    } catch (error) {
      console.error('Authelia first factor failed:', error);
      throw error;
    }
  }

  /**
   * Step 2: Request OTP code via email
   * Uses token from first factor
   */
  async requestOTP(token: string): Promise<AutheliaResponse> {
    try {
      const response = await http.post<AutheliaResponse>(
        `${this.baseUrl}/api/secondfactor/oidc`,
        { token },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );

      return response.data;
    } catch (error) {
      console.error('Authelia OTP request failed:', error);
      throw error;
    }
  }

  /**
   * Step 3: Validate OTP code
   * Completes the authentication flow
   */
  async validateOTP(otpData: AutheliaOTPValidate): Promise<AutheliaResponse> {
    try {
      const response = await http.post<AutheliaResponse>(
        `${this.baseUrl}/api/secondfactor/oidc/validate`,
        otpData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );

      return response.data;
    } catch (error) {
      console.error('Authelia OTP validation failed:', error);
      throw error;
    }
  }

  /**
   * Get user info after successful authentication
   */
  async getUserInfo(): Promise<AutheliaUserInfo> {
    try {
      const response = await http.get<AutheliaUserInfo>(`${this.baseUrl}/api/user/info`, {
        withCredentials: true,
      });

      return response.data;
    } catch (error) {
      console.error('Authelia user info failed:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(data: AutheliaPasswordReset): Promise<AutheliaResponse> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', data.username);

      const response = await http.post<AutheliaResponse>(
        `${this.baseUrl}/api/password-reset/identify`,
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Authelia password reset failed:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<AutheliaResponse> {
    try {
      const formData = new URLSearchParams();
      formData.append('token', token);
      formData.append('password', newPassword);
      formData.append('password_confirmation', newPassword);

      const response = await http.post<AutheliaResponse>(
        `${this.baseUrl}/api/password-reset/reset`,
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Authelia password reset failed:', error);
      throw error;
    }
  }

  /**
   * Logout from Authelia
   */
  async logout(): Promise<void> {
    try {
      // Clear local session
      await http.post(`${this.baseUrl}/api/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Authelia logout failed:', error);
      // Continue with local logout even if Authelia logout fails
    }
  }

  /**
   * Check if user is authenticated with Authelia
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.getUserInfo();
      return true;
    } catch {
      return false;
    }
  }
}

export const autheliaService = new AutheliaService();
