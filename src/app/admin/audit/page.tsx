import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireAdmin("/admin/audit");
  const logs = await db.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { adminUser: { select: { email: true, name: true } } }
  });

  return (
    <section className="space-y-7">
      <AdminSectionNav current="audit" />
      <div>
        <p className="concept-kicker">ADMIN · AUDIT LOG</p>
        <h1 className="mt-3 text-4xl text-[var(--text-primary)]">Журнал действий</h1>
        <p className="mt-3 max-w-3xl text-[var(--text-secondary)]">Последние 200 административных действий: блокировки, роли, moderation, удаление и отзыв доступа.</p>
      </div>
      <div className="overflow-x-auto rounded-[24px] border border-[var(--surface-border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-[var(--text-muted)]">
            <tr><th className="px-4 py-3">Время</th><th className="px-4 py-3">Администратор</th><th className="px-4 py-3">Действие</th><th className="px-4 py-3">Цель</th></tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-border)]">
            {logs.map((log) => (
              <tr key={log.id} className="text-[var(--text-secondary)]">
                <td className="whitespace-nowrap px-4 py-3">{log.createdAt.toLocaleString("ru-RU")}</td>
                <td className="px-4 py-3">{log.adminUser?.email ?? "deleted admin"}</td>
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{log.action}</td>
                <td className="px-4 py-3">{log.targetType}{log.targetId ? ` · ${log.targetId}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
