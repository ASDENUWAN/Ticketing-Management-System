import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useLocation } from "react-router";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const requestVersion = useRef(0);

  /**
   * Fetch current user, roles and permissions.
   *
   * Avoid outdated requests overwriting newer
   * authentication information.
   */
  const refreshUser = useCallback(async () => {
    const version = ++requestVersion.current;

    try {
      const response = await api.get("/api/me");

      if (version === requestVersion.current) {
        setUser(response.data.user);
      }

      return response.data.user;
    } catch (error) {
      if (version === requestVersion.current) {
        if (error.response?.status === 401) {
          setUser(null);
        }
      }

      return null;
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Refresh authentication when route changes.
   *
   * Example:
   * Dashboard -> Users -> Dashboard.
   */
  useEffect(() => {
    refreshUser();
  }, [refreshUser, location.pathname]);

  /**
   * Refresh permissions when returning to the tab
   * or window, and periodically while it is open.
   */
  useEffect(() => {
    function handleFocus() {
      if (!document.hidden) {
        refreshUser();
      }
    }

    function handleVisibility() {
      if (!document.hidden) {
        refreshUser();
      }
    }

    window.addEventListener("focus", handleFocus);

    document.addEventListener("visibilitychange", handleVisibility);

    const interval = window.setInterval(() => {
      if (!document.hidden) {
        refreshUser();
      }
    }, 30000);

    return () => {
      window.removeEventListener("focus", handleFocus);

      document.removeEventListener("visibilitychange", handleVisibility);

      window.clearInterval(interval);
    };
  }, [refreshUser]);

  /**
   * Login with username and password.
   */
  async function login(username, password) {
    // Ignore any previous authentication requests.
    ++requestVersion.current;

    await api.get("/sanctum/csrf-cookie");

    const response = await api.post("/api/login", {
      username,
      password,
    });

    ++requestVersion.current;

    setUser(response.data.user);
    setLoading(false);

    return response.data.user;
  }

  /**
   * Secure session logout.
   */
  async function logout() {
    await api.post("/api/logout");

    ++requestVersion.current;

    setUser(null);
    setLoading(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
