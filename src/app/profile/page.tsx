import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Профиль</h1>
        <p className="text-slate-300">Личная информация читателя и роль в системе.</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-400">Имя</dt>
            <dd className="mt-1 text-lg text-slate-100">{user.name ?? "Без имени"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Email</dt>
            <dd className="mt-1 text-lg text-slate-100">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Роль</dt>
            <dd className="mt-1 text-lg text-slate-100">{user.role}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
