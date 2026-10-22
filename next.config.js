/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tide SDK requires webpack (not Turbopack) for strictExportPresence + ESM alias
  // See: LEARNINGS-session-003 L-02
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      resolve: { fullySpecified: false },
    });
    return config;
  },
  async rewrites() {
    return [
      // DPoP auth handler — required for Tide's DPoP token flow (I-12)
      {
        source: "/tide_dpop/:path*",
        destination: "/tide_dpop_auth.html",
      },
    ];
  },
  async headers() {
    return [
      {
        // CSP required for TideCloak's Secure Web Enclave (SWE)
        source: "/tide_dpop/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'",
          },
          {
            key: "Allow-CSP-From",
            value: "*",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
