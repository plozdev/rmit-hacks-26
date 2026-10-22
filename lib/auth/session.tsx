"use client";

import { useCallback, useMemo } from "react";
import { useTideCloak } from "@tidecloak/nextjs";

export function useSession() {
  const tide = useTideCloak();
  const session = useMemo(() => {
    if (!tide.authenticated || !tide.token) return null;
    const sub = tide.getValueFromToken("sub");
    const roles = tide.getValueFromToken("realm_access")?.roles;
    if (typeof sub !== "string") return null;
    return {
      sub,
      username: tide.getValueFromToken("preferred_username") || sub,
      roles: Array.isArray(roles) ? roles.filter((role): role is string => typeof role === "string") : [],
    };
  }, [tide, tide.authenticated, tide.token]);

  const authFetch = useCallback((url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return tide.secureFetch(url, { ...options, headers });
  }, [tide]);

  return {
    session,
    isInitializing: tide.isInitializing,
    initError: tide.initError,
    login: tide.login,
    logout: tide.logout,
    authFetch,
    doEncrypt: tide.doEncrypt,
    doDecrypt: tide.doDecrypt,
  };
}
