import { PasswordForm, ProfileForm } from "@/app/account/account-forms";
import { canAccessAdmin, canAccessFamily, canAccessInvestments, requireUser } from "@/lib/access";
import { formatAuthMethodLabel } from "@/lib/login-activity";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      approvalStatus: true,
      createdAt: true,
      passwordHash: true,
      passwordChangedAt: true,
      loginActivities: {
        orderBy: { timestamp: "desc" },
        take: 8,
        select: {
          id: true,
          timestamp: true,
          authMethod: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const statusMessages = [
    user.approvalStatus === "APPROVED"
      ? "Your account is approved."
      : user.approvalStatus === "PENDING"
        ? "Your account is pending approval."
        : "Your account is rejected. Contact an administrator if this is unexpected.",
    user.passwordChangedAt ? `Password last changed on ${user.passwordChangedAt.toLocaleDateString()}.` : "You have not changed your password yet.",
    user.loginActivities.length > 0
      ? `Recent logins recorded: ${user.loginActivities.length}.`
      : "No login activity has been recorded yet.",
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="space-y-2 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">My User</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">Manage your account profile, access status, and login activity.</p>
      </header>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Account details</h2>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{user.email ?? "No email"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Role</dt>
            <dd>{user.role}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Approval status</dt>
            <dd>{user.approvalStatus}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Member since</dt>
            <dd>{user.createdAt.toISOString().slice(0, 10)}</dd>
          </div>
        </dl>

        <div className="mt-4 rounded-2xl border border-border/70 bg-muted/25 p-4 text-sm">
          <p className="font-medium">Access summary</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>Account page: allowed</li>
            <li>Family: {canAccessFamily(user) ? "allowed" : "not allowed"}</li>
            <li>Investments: {canAccessInvestments(user) ? "allowed" : "not allowed"}</li>
            <li>Admin: {canAccessAdmin(user) ? "allowed" : "not allowed"}</li>
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Edit profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">Update the profile fields you are allowed to change.</p>
        <div className="mt-4">
          <ProfileForm defaultName={user.name ?? ""} />
        </div>
      </section>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Change password</h2>
        <p className="mt-1 text-sm text-muted-foreground">Use at least 8 characters. If your account had no password, you can set one now.</p>
        <div className="mt-4">
          <PasswordForm hasPassword={Boolean(user.passwordHash)} />
        </div>
      </section>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Notifications & status</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {statusMessages.map((message) => (
            <li key={message} className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              {message}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Recent login activity</h2>
        {user.loginActivities.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No login activity yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {user.loginActivities.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                <span className="font-medium">{formatAuthMethodLabel(entry.authMethod)}</span>
                <span className="text-muted-foreground"> · {entry.timestamp.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
