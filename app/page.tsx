"use client";

/**
 * Proof/Gate — Main dashboard page
 *
 * TideCloak touchpoints in this file:
 *   1. Login: Simulated persona picker → real = TideCloakProvider.login() → SWE
 *   2. Session: useSession() → real = useTideCloak()
 *   3. API calls: authFetch() → real = secureFetch() with DPoP proofs
 *   4. E2EE: doEncrypt/doDecrypt stubs → real = @tidecloak/nextjs browser SDK
 *   5. Role checks: session.roles.includes() — same in real JWT payload
 */

import { useState } from "react";
import { useSession } from "@/lib/auth/mockSession";
import LoginScreen from "@/components/LoginScreen";
import Nav from "@/components/Nav";
import CasePanel from "@/components/CasePanel";
import RequestsPanel from "@/components/RequestsPanel";
import AdminPanel from "@/components/AdminPanel";
import TrustChainPanel from "@/components/TrustChainPanel";

type TabId = "case" | "requests" | "admin" | "trust";

export default function Home() {
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>("case");

  if (!session) {
    return <LoginScreen />;
  }

  const isAdmin = session.roles.includes("tide-realm-admin");

  const tabs: { id: TabId; label: string; icon: string; adminOnly?: boolean }[] = [
    { id: "case", label: "Evidence", icon: "🔒" },
    { id: "requests", label: "Access Requests", icon: "📋" },
    { id: "admin", label: "Admin Panel", icon: "🛡️", adminOnly: true },
    { id: "trust", label: "Trust Architecture", icon: "🌊" },
  ];

  return (
    <div className="app-shell">
      {/* Simulation warning banner */}
      <div className="sim-banner">
        ⚠ SIMULATION MODE — TideCloak not connected · Set TIDE_SIMULATION=false when localhost:8080 is running · Roles simulate QEA-governed JWT claims
      </div>

      <Nav />

      <main className="main-content animate-in">
        {/* Tabs */}
        <div className="tabs">
          {tabs
            .filter((t) => !t.adminOnly || isAdmin)
            .map((t) => (
              <button
                key={t.id}
                className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}
                id={`tab-${t.id}`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
        </div>

        {/* Tab content */}
        {activeTab === "case" && <CasePanel />}
        {activeTab === "requests" && <RequestsPanel />}
        {activeTab === "admin" && isAdmin && <AdminPanel />}
        {activeTab === "trust" && <TrustChainPanel />}
      </main>
    </div>
  );
}
