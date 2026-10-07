import { AccountPanel } from "@/components/profile/account-panel";
import { SettingsPanel } from "@/components/profile/settings-panel";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser("/profile");

  return (
    <div className="space-y-7">
      <AccountPanel initialName={user.name ?? ""} email={user.email} initialImage={user.image ?? null} />
      <SettingsPanel />
    </div>
  );
}
