import { UserRound, ShieldCheck } from "lucide-react";

import { useAuth } from "../../context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  const fields = [
    {
      label: "Username",
      value: user?.username,
    },
    {
      label: "Full name",
      value: user?.name,
    },
    {
      label: "Email",
      value: user?.email,
    },
    {
      label: "Contact number",
      value: user?.contact_no,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>

        <p className="mt-2 text-sm text-slate-500">
          Your personal information and account roles.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 border-b border-slate-100 p-6">
          <div className="rounded-xl bg-red-50 p-3 text-brand">
            <UserRound size={25} />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">
              {user?.name || user?.username}
            </h2>

            <p className="text-sm text-slate-500">@{user?.username}</p>
          </div>
        </div>

        <dl className="divide-y divide-slate-100">
          {fields.map((field) => (
            <div
              key={field.label}
              className="grid gap-1 px-6 py-4 sm:grid-cols-3 sm:gap-4"
            >
              <dt className="text-sm font-medium text-slate-500">
                {field.label}
              </dt>

              <dd className="break-words text-sm text-slate-900 sm:col-span-2">
                {field.value || "Not provided"}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck size={20} className="text-brand" />

          <h2 className="font-semibold">Assigned Roles</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {user?.roles?.length ? (
            user.roles.map((role) => (
              <span
                key={role}
                className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-brand"
              >
                {role}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500">No roles assigned.</p>
          )}
        </div>
      </section>

      <p className="text-sm text-slate-500">
        Your username is permanent. Profile editing will be added in the
        profile-management step.
      </p>
    </div>
  );
}
