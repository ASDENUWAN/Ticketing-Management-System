import { useEffect, useState } from "react";

import { NavLink, Outlet, useLocation, useNavigate } from "react-router";

import {
  LayoutDashboard,
  UsersRound,
  ShieldCheck,
  KeyRound,
  UserRound,
  Ticket,
  Menu,
  X,
  Layers3,
  LogOut,
  Monitor,
} from "lucide-react";

import UniversityMark from "../components/UniversityMark";
import { useAuth } from "../context/AuthContext";
import { can } from "../utils/permissions";
import useTimedMessage from "../hooks/useTimedMessage";

const navigation = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    permission: null,
  },
  {
    label: "Users",
    path: "/users",
    icon: UsersRound,
    permission: "users.view",
  },
  {
    label: "Roles",
    path: "/roles",
    icon: ShieldCheck,
    permission: "roles.view",
  },
  {
    label: "Permissions",
    path: "/permissions",
    icon: KeyRound,
    permission: "permissions.view",
  },
  {
    label: "Categories",
    path: "/categories",
    icon: Layers3,
    permission: "categories.view",
  },

  {
    label: "My Systems",
    path: "/my-systems",
    icon: Monitor,
    permission: null,
  },
  {
    label: "Systems",
    path: "/systems",
    icon: Layers3,
    permission: "systems.view",
  },

  {
    label: "My Profile",
    path: "/profile",
    icon: UserRound,
    permission: null,
  },
];

function SidebarContent({ user, onNavigate }) {
  const visibleLinks = navigation.filter(
    (item) => !item.permission || can(user, item.permission),
  );

  return (
    <div className="flex h-full flex-col">
      {/* UNIVERSITY BRANDING */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-6">
        <UniversityMark size="small" />

        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-brand-deep">
            USJ CITS Desk
          </h1>

          <p className="text-xs text-slate-500">Systems Support Portal</p>
        </div>
      </div>

      {/* WORKSPACE */}
      <div className="px-4 pt-7">
        <p className="px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Workspace
        </p>
      </div>

      <nav aria-label="Main navigation" className="mt-3 space-y-1 px-3">
        {visibleLinks.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 rounded-xl px-4 py-3",
                  "text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2",
                  "focus-visible:outline-brand",
                  isActive
                    ? "bg-red-50 text-brand"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")
              }
            >
              <Icon size={19} className="shrink-0" aria-hidden="true" />

              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* TICKETING MODULE */}
      <div className="mt-8 px-4">
        <p className="px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Ticketing
        </p>

        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm text-slate-400">
          <span className="flex items-center gap-3">
            <Ticket size={19} aria-hidden="true" />
            Tickets
          </span>

          <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold">
            SOON
          </span>
        </div>
      </div>

      {/* CLICKABLE ACCOUNT AT SIDEBAR BOTTOM */}
      <div className="mt-auto border-t border-slate-200 p-4">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          aria-label="View my profile"
          className={({ isActive }) =>
            [
              "group flex items-center gap-3 rounded-xl p-3",
              "transition-colors focus-visible:outline-2",
              "focus-visible:outline-brand",
              isActive ? "bg-red-50" : "bg-slate-50 hover:bg-red-50",
            ].join(" ")
          }
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-deep text-sm font-semibold text-white">
            {(user?.name || user?.username || "U").charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-brand">
              {user?.name || user?.username}
            </p>

            <p className="truncate text-xs text-slate-500">@{user?.username}</p>
          </div>
        </NavLink>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

  const errorNotice = useTimedMessage(30000);

  const currentPage =
    navigation.find((item) => item.path === location.pathname)?.label ||
    "USJ CITS Desk";

  // Close drawer whenever navigation changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Support closing the mobile drawer
  // using the Escape key.
  useEffect(() => {
    if (!mobileOpen) return;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    errorNotice.clear();

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      errorNotice.show("Unable to sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-app-bg text-slate-900">
      {/* DESKTOP SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <SidebarContent user={user} />
      </aside>

      {/* MOBILE SIDEBAR */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/50"
          />

          <aside
            aria-label="Mobile navigation"
            className="relative h-full w-[min(18rem,85vw)] bg-white shadow-xl"
          >
            <SidebarContent
              user={user}
              onNavigate={() => setMobileOpen(false)}
            />

            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand"
            >
              <X size={20} />
            </button>
          </aside>
        </div>
      )}

      {/* MAIN APPLICATION */}
      <div className="min-h-screen lg:pl-72">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-18 items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand lg:hidden"
              >
                <Menu size={21} />
              </button>

              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">
                  USJ CITS Desk
                </p>

                <h2 className="truncate text-lg font-bold sm:text-xl">
                  {currentPage}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* CLICKABLE TOP-RIGHT PROFILE */}
              <NavLink
                to="/profile"
                aria-label="Open my profile"
                title="View my profile"
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-xl px-2 py-2",
                    "transition-colors hover:bg-red-50",
                    "focus-visible:outline-2 focus-visible:outline-brand",
                    isActive ? "bg-red-50" : "",
                  ].join(" ")
                }
              >
                <div className="hidden text-right sm:block">
                  <p className="max-w-36 truncate text-sm font-semibold text-slate-800">
                    {user?.name || user?.username}
                  </p>

                  <p className="text-xs text-slate-500">
                    {user?.is_super_admin
                      ? "Super Admin"
                      : user?.roles?.[0] || "My Profile"}
                  </p>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-semibold text-brand">
                  {(user?.name || user?.username || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              </NavLink>

              {/* LOGOUT */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sign out"
                aria-label="Sign out"
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
              >
                <LogOut size={18} />

                <span className="hidden sm:inline">
                  {loggingOut ? "Signing out..." : "Sign out"}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          {errorNotice.message && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {errorNotice.message}
            </div>
          )}

          <Outlet />
        </main>
      </div>
    </div>
  );
}
