import { Link } from "react-router";

import {
  ArrowRight,
  UsersRound,
  ShieldCheck,
  KeyRound,
  Ticket,
  CheckCircle2,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { can } from "../../utils/permissions";

const modules = [
  {
    title: "User Management",
    description: "Manage user accounts, contact details, and access.",
    path: "/users",
    permission: "users.view",
    icon: UsersRound,
  },
  {
    title: "Role Management",
    description: "Organize users through dynamic roles.",
    path: "/roles",
    permission: "roles.view",
    icon: ShieldCheck,
  },
  {
    title: "Permission Management",
    description: "Manage fine-grained system access.",
    path: "/permissions",
    permission: "permissions.view",
    icon: KeyRound,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const visibleModules = modules.filter((module) =>
    can(user, module.permission),
  );

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <section className="relative overflow-hidden rounded-2xl bg-brand-deep px-6 py-8 text-white sm:px-9 sm:py-10">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-28 h-72 w-72 rounded-full border border-white/15"
        />

        <div className="relative">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-amber-200">
            <CheckCircle2 size={15} />
            Signed in successfully
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {user?.name || user?.username}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">
            Welcome to USJ CITS Desk, the support administration platform for
            systems developed and maintained by CITS.
          </p>
        </div>
      </section>

      {/* Modules */}
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-bold">Your workspace</h2>

          <p className="mt-1 text-sm text-slate-500">
            Administration modules available to your account.
          </p>
        </div>

        {visibleModules.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleModules.map((module) => {
              const Icon = module.icon;

              return (
                <Link
                  to={module.path}
                  key={module.path}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <div className="mb-5 inline-flex rounded-xl bg-red-50 p-3 text-brand">
                    <Icon size={24} />
                  </div>

                  <h3 className="text-base font-semibold text-slate-900">
                    {module.title}
                  </h3>

                  <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                    {module.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-medium text-brand">
                    Open module
                    <ArrowRight
                      size={17}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-600">
              No management modules are assigned to your account. Contact your
              administrator if you require additional access.
            </p>
          </div>
        )}
      </section>

      {/* Upcoming ticket module */}
      <section className="flex flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
        <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
          <Ticket size={25} />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold">Ticket Management</h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Issue reporting, ticket assignment, and resolution tracking will be
            added after the ticketing backend is developed.
          </p>
        </div>

        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
          Coming later
        </span>
      </section>
    </div>
  );
}
