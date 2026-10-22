import type { Metadata } from "next";
import { MockTideCloakProvider } from "@/lib/auth/mockSession";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proof/Gate — TideCloak Evidence Portal",
  description:
    "Cryptographic evidence custody system. A case custodian can seal synthetic evidence, but cannot unseal it until a TideCloak role change survives an independent QEA quorum.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/*
         * PRODUCTION: Replace MockTideCloakProvider with:
         *   import { TideCloakProvider } from '@tidecloak/nextjs';
         *   import tcConfig from '../data/tidecloak.json';
         *   <TideCloakProvider config={{ ...tcConfig, useDPoP: { mode: 'strict', alg: 'ES256' } }}>
         *     {children}
         *   </TideCloakProvider>
         */}
        <MockTideCloakProvider>
          {children}
        </MockTideCloakProvider>
      </body>
    </html>
  );
}
