import { AccountPanel } from "@/components/profile/account-panel";
import { PublicationPushSettings } from "@/components/profile/publication-push-settings";
import { SettingsPanel } from "@/components/profile/settings-panel";
import { requireUser } from "@/lib/auth";
import { getVapidConfig } from "@/lib/pwa/push";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser("/profile");

  return (
    <div className="space-y-7">
      <AccountPanel initialName={user.name ?? ""} email={user.email} initialImage={user.image ?? null} />
      <SettingsPanel />
      <PublicationPushSettings publicKey={getVapidConfig()?.publicKey ?? null} />
    </div>
  );
}
