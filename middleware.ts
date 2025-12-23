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


