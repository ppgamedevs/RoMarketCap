import { redirect } from "next/navigation";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { ApiKeyCreateForm } from "@/components/admin/ApiKeyCreateForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminApiKeysPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, label: true, plan: true, last4: true, active: true, createdAt: true, lastUsedAt: true, rateLimitKind: true },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
      <p className="mt-2 text-sm text-muted-foreground">Create partner keys and control access to public endpoints.</p>

      <div className="mt-6">
        <ApiKeyCreateForm />
      </div>

      <section className="mt-8 rounded-xl border bg-card p-6">
        <h2 className="text-sm font-medium">Keys</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Label</th>
                <th className="py-2">Plan</th>
                <th className="py-2">Tier</th>
                <th className="py-2">Key</th>
                <th className="py-2">Active</th>
                <th className="py-2">Last used</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-t">
                  <td className="py-2">{k.label}</td>
                  <td className="py-2 text-muted-foreground">{k.plan}</td>
                  <td className="py-2 text-muted-foreground">{k.rateLimitKind}</td>
                  <td className="py-2 text-muted-foreground">****{k.last4}</td>
                  <td className="py-2 text-muted-foreground">{k.active ? "yes" : "no"}</td>
                  <td className="py-2 text-muted-foreground">{k.lastUsedAt ? k.lastUsedAt.toISOString().slice(0, 10) : "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}


