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
          pathname === "/api/admin/add-company-risk-flags") {
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


