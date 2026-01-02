import { withAuth } from "next-auth/middleware";

function adminAllowlist() {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const pathname = req.nextUrl.pathname;
      
      // Allow migration endpoints without auth (they have their own secret protection)
      if (pathname === "/api/admin/migrate-password" || 
          pathname === "/api/admin/check-db" || 
          pathname === "/api/admin/run-initial-migration" ||
          pathname === "/api/admin/check-auth-tables" ||
          pathname === "/api/admin/test-auth" ||
          pathname === "/api/admin/check-auth-config" ||
          pathname === "/api/admin/add-export-credits-column" ||
          pathname === "/api/admin/check-verification-table" ||
          pathname === "/api/admin/add-premium-columns" ||
          pathname === "/api/admin/add-all-user-columns" ||
          pathname === "/api/admin/setup-database" ||
          pathname === "/api/admin/add-gdpr-columns" ||
          pathname === "/api/admin/add-company-columns" ||
          pathname === "/api/admin/check-company-columns" ||
          pathname === "/api/admin/add-missing-company-columns" ||
          pathname === "/api/admin/add-import-jobs-tables" ||
          pathname === "/api/admin/add-company-risk-flags" ||
      pathname === "/api/admin/add-universe-columns" ||
      pathname === "/api/admin/add-company-provenance-table" ||
      pathname === "/api/admin/add-scoring-columns" ||
      pathname === "/api/admin/fetch-company-names-from-anaf" ||
      pathname === "/api/admin/debug-anaf-response" ||
      pathname === "/api/admin/add-ingest-runs-table" ||
      pathname === "/api/admin/add-financial-snapshots-employees-column" ||
      pathname === "/api/admin/add-financial-snapshots-columns" ||
      pathname === "/api/admin/seed-top100" ||
      pathname === "/api/admin/add-bvb-columns" ||
      pathname === "/api/admin/cleanup-placeholder-companies" ||
      pathname === "/api/admin/cleanup-public-entities" ||
      pathname === "/api/admin/sync-bvb" ||
      pathname === "/api/admin/run-anaf-bulk-financials" ||
      pathname === "/api/admin/add-team-members-table" ||
      pathname === "/api/admin/add-company-verification-table" ||
      pathname === "/api/admin/add-company-change-logs-table" ||
      pathname === "/api/admin/add-logo-url-column" ||
      pathname === "/api/admin/fetch-logos" ||
      pathname === "/api/admin/add-financial-data-source-enum" ||
      pathname === "/api/admin/seed-bvb-market-caps" ||
      pathname === "/api/admin/seed-all-bvb-companies" ||
      pathname === "/api/admin/seed-major-companies-revenue" ||
      pathname === "/api/admin/calculate-market-caps" ||
      pathname === "/api/admin/check-companies-without-marketcap" ||
      pathname === "/api/admin/check-revenue-data" ||
      pathname === "/api/admin/debug-company-status" ||
      pathname === "/api/admin/boost-major-companies-confidence" ||
      pathname === "/api/admin/test-market-api" ||
      pathname === "/api/admin/clear-market-cache" ||
      pathname === "/api/admin/debug-market-cap-data" || // Debug market cap data
      pathname === "/api/admin/check-cui-mismatch" || // Check CUI mismatches
      pathname === "/api/admin/debug-missing-marketcaps" || // Debug missing market caps
      pathname === "/api/admin/check-top100-coverage") { // NEW: Check top100 coverage
    return true;
  }
      
      const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
      if (!isAdminPath) return true;
      const email = (token?.email ?? "").toLowerCase();
      if (!email) return false;
      const admins = adminAllowlist();
      return admins.has(email);
    },
  },
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};


