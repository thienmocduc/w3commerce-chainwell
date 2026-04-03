import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupaUser, Session } from '@supabase/supabase-js';

/** Backend API base URL — reads from VITE_API_URL env var in production */
export const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

export type UserRole = 'user' | 'koc' | 'vendor' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  referral_code?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
}

interface LoginResult {
  success: boolean;
  error?: string;
}

interface Enable2FAResult {
  success: boolean;
  error?: string;
  qrCode?: string;
  secret?: string;
}

interface Verify2FAResult {
  success: boolean;
  error?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  loginWithCredentials: (email: string, password: string, role?: UserRole) => LoginResult;
  loginAsync: (email: string, password: string, role?: UserRole) => Promise<LoginResult>;
  loginWithGoogle: () => Promise<LoginResult>;
  loginWithFacebook: () => Promise<LoginResult>;
  loginWithWallet: () => Promise<LoginResult>;
  registerAsync: (data: RegisterData) => Promise<LoginResult>;
  logout: () => void;
  enable2FA: () => Promise<Enable2FAResult>;
  verify2FA: (factorId: string, code: string) => Promise<Verify2FAResult>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
  referral_code?: string;
}

const STORAGE_KEY = 'wellkoc-auth';

/* ── Map Supabase user to our User type ── */
function mapSupaUser(su: SupaUser, roleOverride?: UserRole): User {
  const meta = su.user_metadata || {};
  return {
    id: su.id,
    email: su.email || '',
    name: meta.full_name || meta.name || su.email?.split('@')[0] || 'User',
    role: (meta.role as UserRole) || roleOverride || 'user',
    avatar: meta.avatar_url || meta.avatar,
    phone: su.phone || meta.phone,
    referral_code: meta.referral_code || `WK-${su.id.slice(0, 6).toUpperCase()}`,
  };
}

function getStoredAuth(): AuthState {
  if (typeof window === 'undefined') return { user: null, token: null, refreshToken: null };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AuthState;
      if (parsed.user && parsed.token) return parsed;
    }
  } catch { /* ignore */ }
  return { user: null, token: null, refreshToken: null };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(getStoredAuth);
  const [loading, setLoading] = useState(true);

  // Persist to localStorage
  useEffect(() => {
    if (authState.user && authState.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [authState]);

  // Listen to Supabase auth changes
  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = mapSupaUser(session.user);
        setAuthState({ user, token: session.access_token, refreshToken: session.refresh_token || null });
      }
      setLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = mapSupaUser(session.user);
        setAuthState({ user, token: session.access_token, refreshToken: session.refresh_token || null });
      } else if (_event === 'SIGNED_OUT') {
        setAuthState({ user: null, token: null, refreshToken: null });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Direct login (for external use)
  const login = useCallback((user: User, token: string) => {
    setAuthState({ user, token, refreshToken: null });
  }, []);

  // Async login — Supabase Auth only (no mock fallback)
  const loginAsync = useCallback(async (email: string, password: string, role: UserRole = 'user'): Promise<LoginResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setLoading(false);
        // Translate common errors to Vietnamese
        const msg = error.message.includes('Invalid login')
          ? 'Email hoặc mật khẩu không đúng'
          : error.message.includes('Email not confirmed')
          ? 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.'
          : error.message;
        return { success: false, error: msg };
      }

      if (data.user && data.session) {
        const user = mapSupaUser(data.user, role);

        // For admin role requests, verify from user_metadata
        if (role === 'admin' && user.role !== 'admin') {
          await supabase.auth.signOut();
          setLoading(false);
          return { success: false, error: 'Tài khoản không có quyền Admin' };
        }

        setAuthState({
          user,
          token: data.session.access_token,
          refreshToken: data.session.refresh_token || null,
        });
        return { success: true };
      }

      return { success: false, error: 'Đăng nhập thất bại' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi kết nối' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync loginWithCredentials — kept for backward compat but now delegates to loginAsync
  // Callers should prefer loginAsync directly for proper error handling.
  const loginWithCredentials = useCallback(
    (email: string, password: string, role: UserRole = 'user'): LoginResult => {
      if (!email || password.length < 6) {
        return { success: false, error: 'Email hoặc mật khẩu không đúng' };
      }
      // Fire async login without blocking — real result via onAuthStateChange
      loginAsync(email, password, role).catch(() => {});
      return { success: true };
    },
    [loginAsync],
  );

  // Google OAuth login
  const loginWithGoogle = useCallback(async (): Promise<LoginResult> => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  // Facebook OAuth login
  const loginWithFacebook = useCallback(async (): Promise<LoginResult> => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  // Wallet login — MetaMask / injected wallet
  const loginWithWallet = useCallback(async (): Promise<LoginResult> => {
    try {
      const eth = (window as any).ethereum;
      if (!eth) return { success: false, error: 'Vui lòng cài MetaMask hoặc ví tương thích' };

      // Request account access
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      if (!accounts.length) return { success: false, error: 'Không tìm thấy tài khoản ví' };
      const address = accounts[0];

      // Create sign message
      const timestamp = Date.now();
      const message = `Sign in to WellKOC\nWallet: ${address}\nTimestamp: ${timestamp}`;

      // Sign message with wallet
      const signature: string = await eth.request({
        method: 'personal_sign',
        params: [message, address],
      });

      // Send to backend for verification
      const res = await fetch(`${API_BASE}/auth/wallet/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address, signature, message }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.detail || 'Xác thực ví thất bại' };
      }

      const data = await res.json();
      // Backend returns JWT tokens — create user session
      const user: User = {
        id: data.user?.id || address,
        email: data.user?.email || '',
        name: data.user?.display_name || `${address.slice(0, 6)}...${address.slice(-4)}`,
        role: (data.user?.role as UserRole) || 'user',
        avatar: data.user?.avatar_url,
      };
      setAuthState({ user, token: data.access_token, refreshToken: data.refresh_token || null });
      return { success: true };
    } catch (err: any) {
      if (err.code === 4001) return { success: false, error: 'Bạn đã từ chối kết nối ví' };
      return { success: false, error: err.message || 'Lỗi kết nối ví' };
    }
  }, []);

  // Register — Supabase Auth
  const registerAsync = useCallback(async (data: RegisterData): Promise<LoginResult> => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
            name: data.name,
            role: data.role,
            phone: data.phone,
            referral_code: data.referral_code,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        setLoading(false);
        console.error('[Register Error]', error.message, error);
        const msg = error.message.includes('already registered')
          ? 'Email này đã được đăng ký. Vui lòng đăng nhập.'
          : error.message.includes('Password should be')
          ? 'Mật khẩu phải có ít nhất 6 ký tự'
          : error.message.includes('email')
          ? 'Lỗi khi gửi email xác nhận. Vui lòng thử email khác.'
          : error.message;
        return { success: false, error: msg };
      }

      // Supabase may auto-confirm or require email confirmation
      if (result.session && result.user) {
        // Auto-confirmed — login immediately
        const user = mapSupaUser(result.user, data.role);
        setAuthState({
          user,
          token: result.session.access_token,
          refreshToken: result.session.refresh_token || null,
        });
        return { success: true };
      }

      if (result.user && !result.session) {
        // Email confirmation required
        return { success: true, error: 'confirm_email' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Đăng ký thất bại' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Enable 2FA (TOTP)
  const enable2FA = useCallback(async (): Promise<Enable2FAResult> => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'WellKOC Authenticator',
    });
    if (error) return { success: false, error: error.message };
    return { success: true, qrCode: data.totp.qr_code, secret: data.totp.secret };
  }, []);

  // Verify 2FA
  const verify2FA = useCallback(async (factorId: string, code: string): Promise<Verify2FAResult> => {
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) return { success: false, error: challenge.error.message };

    const verify = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code,
    });
    if (verify.error) return { success: false, error: verify.error.message };
    return { success: true };
  }, []);

  // Logout
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthState({ user: null, token: null, refreshToken: null });
  }, []);

  const isAuthenticated = authState.user !== null && authState.token !== null;
  const isAdmin = authState.user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user: authState.user,
      token: authState.token,
      login,
      loginWithCredentials,
      loginAsync,
      loginWithGoogle,
      loginWithFacebook,
      loginWithWallet,
      registerAsync,
      logout,
      enable2FA,
      verify2FA,
      isAuthenticated,
      isAdmin,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      token: null,
      login: () => {},
      loginWithCredentials: () => ({ success: false, error: 'No auth provider' }),
      loginAsync: async () => ({ success: false, error: 'No auth provider' }),
      loginWithGoogle: async () => ({ success: false, error: 'No auth provider' }),
      loginWithFacebook: async () => ({ success: false, error: 'No auth provider' }),
      loginWithWallet: async () => ({ success: false, error: 'No auth provider' }),
      registerAsync: async () => ({ success: false, error: 'No auth provider' }),
      logout: () => {},
      enable2FA: async () => ({ success: false, error: 'No auth provider' }),
      verify2FA: async () => ({ success: false, error: 'No auth provider' }),
      isAuthenticated: false,
      isAdmin: false,
      loading: false,
    };
  }
  return ctx;
}
