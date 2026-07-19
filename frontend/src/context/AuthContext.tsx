import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, getToken, setToken, setUnauthorizedHandler } from "@/lib/api";
import type { AuthResponse, LoginRequest, RegisterRequest, Role } from "@/types/api";

interface CurrentUser {
  email: string;
  role: Role;
}

interface AuthContextValue {
  user: CurrentUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const USER_STORAGE_KEY = "krateon_user";

function readStoredUser(): CurrentUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<CurrentUser | null>(() => readStoredUser());

  const clearSession = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  // Registers the callback the API client invokes when an authenticated request
  // comes back 401, so the session is cleared and the user is sent to /login
  // without a full page reload.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      navigate("/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate, clearSession]);

  const applyAuthResponse = useCallback((response: AuthResponse) => {
    setToken(response.token);
    setTokenState(response.token);
    const nextUser: CurrentUser = { email: response.email, role: response.role };
    setUser(nextUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  }, []);

  const login = useCallback(
    async (payload: LoginRequest) => {
      const response = await authApi.login(payload);
      applyAuthResponse(response);
    },
    [applyAuthResponse],
  );

  const register = useCallback(
    async (payload: RegisterRequest) => {
      const response = await authApi.register(payload);
      applyAuthResponse(response);
    },
    [applyAuthResponse],
  );

  const logout = useCallback(() => {
    clearSession();
    navigate("/login");
  }, [clearSession, navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isAuthenticated: Boolean(token), login, register, logout }),
    [user, token, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
