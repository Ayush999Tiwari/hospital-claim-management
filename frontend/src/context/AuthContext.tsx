"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  loginUser,
  getCurrentUser,
  type AuthenticatedUser,
  type UserRole,
} from "@/lib/api";

interface AuthContextType {
  user: AuthenticatedUser | null;
  token: string | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    role: UserRole,
    keepSignedIn: boolean
  ) => Promise<AuthenticatedUser>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    sessionStorage.removeItem("access_token");
    localStorage.removeItem("access_token");
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const savedToken =
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("access_token");

      if (!savedToken) {
        if (active) setLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser(savedToken);

        if (active) {
          setToken(savedToken);
          setUser(currentUser);
        }
      } catch {
        sessionStorage.removeItem("access_token");
        localStorage.removeItem("access_token");
      } finally {
        if (active) setLoading(false);
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string,
      role: UserRole,
      keepSignedIn: boolean
    ) => {
      const result = await loginUser(email, password, role);
      const accessToken = result.access_token;

      const currentUser = await getCurrentUser(accessToken);

      // Confirm the backend authenticated the selected role.
      if (!currentUser.roles.includes(role)) {
        throw new Error("Your account does not have the selected role.");
      }

      sessionStorage.removeItem("access_token");
      localStorage.removeItem("access_token");

      if (keepSignedIn) {
        localStorage.setItem("access_token", accessToken);
      } else {
        sessionStorage.setItem("access_token", accessToken);
      }

      setToken(accessToken);
      setUser(currentUser);

      return currentUser;
    },
    []
  );

  const hasRole = useCallback(
    (...roles: UserRole[]) =>
      user?.roles.some((role) => roles.includes(role)) ?? false,
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}