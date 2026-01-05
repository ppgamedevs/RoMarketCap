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
      pathname === "/api/admin/test-anaf-full-response" ||
      pathname === "/api/admin/test-mfinante" ||
      pathname === "/api/admin/add-ingest-runs-table" ||
      pathname === "/api/admin/add-financial-snapshots-employees-column" ||
      pathname === "/api/admin/add-financial-snapshots-columns" ||
      pathname === "/api/admin/seed-top100" ||
      pathname === "/api/admin/seed-medium-companies" ||
      pathname === "/api/admin/seed-medium-companies-revenue" ||
      pathname === "/api/admin/add-bvb-columns" ||
      pathname === "/api/admin/add-company-market-cap-history" ||
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
      pathname === "/api/admin/check-top100-coverage" || // Check top100 coverage
      pathname === "/api/admin/debug-bvb-symbols" || // Debug BVB symbols
      pathname === "/api/admin/test-market-api-specific" || // Test market API for specific companies
      pathname === "/api/admin/boost-bvb-companies-confidence" || // Boost BVB companies confidence
      pathname === "/api/admin/check-sif-details" || // Check SIF details
      pathname === "/api/admin/test-market-query" || // Test market query directly
      pathname === "/api/admin/test-homepage-api" || // Test homepage API call
      pathname === "/api/admin/test-prisma-marketcap" || // Test Prisma marketCap query
      pathname === "/api/admin/find-duplicate-companies" || // Find duplicate companies
      pathname === "/api/admin/merge-duplicate-bvb-companies" || // Merge duplicate BVB companies
      pathname === "/api/admin/add-content-cache-tables" || // Add content cache tables for SEO
      pathname === "/api/admin/update-company-ages" || // Update company ages (populate foundedAt from foundedYear)
      pathname === "/api/admin/check-company-ages" || // Check company ages status
      pathname === "/api/admin/test-founding-date" || // Test founding date fetching
      pathname === "/api/admin/update-all-company-ages" || // Update all company ages (automated batches)
      pathname === "/api/admin/cleanup-wrong-founding-dates" || // Cleanup wrong founding dates (2020+)
      pathname === "/api/admin/score-snapshots" || // Admin endpoint for score snapshots
      pathname === "/api/admin/check-score-snapshots" || // Check score snapshots status
      pathname === "/api/admin/clear-score-snapshots-lock" || // Clear stuck score snapshots lock
      pathname === "/api/admin/test-score-snapshots" || // Test score snapshot creation
      pathname === "/api/admin/test-market-api") { // Test market API response
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


