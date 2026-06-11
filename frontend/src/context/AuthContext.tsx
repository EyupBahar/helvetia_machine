"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { clearAuth, getToken, getUsername, setAuth } from "@/lib/auth";
import { api } from "@/lib/api";

interface AuthContextType {
  isAdmin: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const storedUsername = getUsername();
    setIsAdmin(!!token);
    setUsername(storedUsername);
    setLoading(false);
  }, []);

  const login = async (user: string, password: string) => {
    const response = await api.auth.login(user, password);
    setAuth(response.token, response.username);
    setIsAdmin(true);
    setUsername(response.username);
  };

  const logout = () => {
    clearAuth();
    setIsAdmin(false);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, username, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
