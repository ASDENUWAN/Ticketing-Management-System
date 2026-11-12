import { useEffect, useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { can } from "../../utils/permissions";

import UserFormDialog from "./UserFormDialog";
import UserAccessDialog from "./UserAccessDialog";
import DeleteUserDialog from "./DeleteUserDialog";

import { usersApi, apiErrorMessage } from "./usersApi";

// Display the user's assigned roles.
function RoleBadges({ roles = [] }) {
  if (!roles.length) {
    return <span className="text-xs text-slate-400">No roles</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.slice(0, 2).map((role) => (
        <span
          key={role.id}
          className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-brand"
        >
          {role.name}
        </span>
      ))}

      {roles.length > 2 && (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
          +{roles.length - 2}
        </span>
      )}
    </div>
  );
}

// Reusable action buttons for desktop and mobile.
function UserActions({ target, actor, onEdit, onAccess, onDelete }) {
  const protectedAccount =
    target.is_super_admin || Number(target.id) === Number(actor?.id);

  const canEdit = !protectedAccount && can(actor, "users.update");

  const canDelete = !protectedAccount && can(actor, "users.delete");

  const canAssignRoles = can(actor, "roles.assign") && can(actor, "roles.view");

  const canAssignPermissions =
    can(actor, "permissions.assign") && can(actor, "permissions.view");

  const canManageAccess = canEdit && (canAssignRoles || canAssignPermissions);

  if (!canEdit && !canDelete) {
    return (
      <span className="text-xs text-slate-400">
        {protectedAccount ? "Protected" : "View only"}
      </span>
    );
  }

  const buttonClass =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand";

  return (
    <div className="flex flex-wrap gap-2">
      {canEdit && (
        <button
          type="button"
          onClick={() => onEdit(target)}
          className={buttonClass}
          aria-label={`Edit ${target.username}`}
        >
          <Pencil size={15} />
          Edit
        </button>
      )}

      {canManageAccess && (
        <button
          type="button"
          onClick={() => onAccess(target)}
          className={buttonClass}
          aria-label={`Manage access for ${target.username}`}
        >
          <KeyRound size={15} />
          Access
        </button>
      )}

      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(target)}
          className={`${buttonClass} hover:border-red-200 hover:bg-red-50 hover:text-red-700`}
          aria-label={`Delete ${target.username}`}
        >
          <Trash2 size={15} />
          Delete
        </button>
      )}
    </div>
  );
}

function UserIdentity({ user }) {
  const initials = (user.name || user.username || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-brand">
        {initials}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">
          {user.name}
        </p>

        <p className="truncate text-xs text-slate-500">@{user.username}</p>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: actor } = useAuth();

  const [users, setUsers] = useState([]);

  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // { type: "form" | "access" | "delete", user }
  const [dialog, setDialog] = useState(null);

  // Debounced server-side search.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearchTerm(search.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // Load users from Laravel.
  useEffect(() => {
    const controller = new AbortController();

    async function loadUsers() {
      setLoading(true);
      setError("");

      try {
        const response = await usersApi.list({
          page,
          search: searchTerm,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setUsers(response.data ?? []);
        setMeta(response.meta);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(apiErrorMessage(err, "Unable to load the user list."));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadUsers();

    return () => controller.abort();
  }, [page, searchTerm, refresh]);

  function reload(message) {
    if (message) setNotice(message);
    setRefresh((value) => value + 1);
  }

  function onDeleted() {
    setNotice("User deleted successfully.");

    if (users.length === 1 && page > 1) {
      setPage((current) => current - 1);
    } else {
      reload();
    }
  }

  const canCreate = can(actor, "users.create");

  const from = meta.total > 0 ? (meta.current_page - 1) * meta.per_page + 1 : 0;

  const to = meta.total > 0 ? Math.min(from + users.length - 1, meta.total) : 0;

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            User Management
          </h1>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Manage CITS Desk user accounts and access.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => setDialog({ type: "form", user: null })}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Plus size={18} />
            Add user
          </button>
        )}
      </div>

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-red-50 p-3 text-brand">
            <UsersRound size={24} />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              {searchTerm ? "Matching users" : "Total users"}
            </p>

            <p className="mt-1 text-2xl font-bold">{meta.total}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-amber-50 p-3 text-amber-800">
            <ShieldCheck size={24} />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Access management
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900">
              Role-based permissions
            </p>

            <p className="text-xs text-slate-500">Controlled by Laravel</p>
          </div>
        </div>
      </div>

      {/* FEEDBACK */}
      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <span>{notice}</span>

          <button
            type="button"
            onClick={() => setNotice("")}
            className="font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {/* USER LIST */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Search toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative w-full max-w-md">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              aria-label="Search users"
              placeholder="Search name, username, email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              maxLength={100}
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-red-100"
            />
          </div>

          <button
            type="button"
            onClick={() => reload()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div
            role="status"
            className="flex min-h-64 flex-col items-center justify-center gap-3"
          >
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-red-100 border-t-brand" />

            <p className="text-sm text-slate-500">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
            <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
              <UserRound size={30} />
            </div>

            <h3 className="mt-4 font-semibold">No users found</h3>

            <p className="mt-2 max-w-sm text-sm text-slate-500">
              {searchTerm
                ? "Try searching with another name or username."
                : "There are no user accounts to display."}
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4">User</th>
                    <th className="px-5 py-4">Contact</th>
                    <th className="px-5 py-4">Roles</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="align-middle hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <UserIdentity user={user} />
                      </td>

                      <td className="px-5 py-4">
                        <p className="max-w-48 truncate text-sm text-slate-700">
                          {user.email || "No email"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {user.contact_no || "No contact"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <RoleBadges roles={user.roles} />
                      </td>

                      <td className="px-5 py-4">
                        <UserActions
                          target={user}
                          actor={actor}
                          onEdit={(target) =>
                            setDialog({
                              type: "form",
                              user: target,
                            })
                          }
                          onAccess={(target) =>
                            setDialog({
                              type: "access",
                              user: target,
                            })
                          }
                          onDelete={(target) =>
                            setDialog({
                              type: "delete",
                              user: target,
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="divide-y divide-slate-100 md:hidden">
              {users.map((user) => (
                <article key={user.id} className="space-y-4 p-5">
                  <UserIdentity user={user} />

                  <div className="space-y-2 text-sm">
                    <p className="break-all text-slate-600">
                      {user.email || "No email provided"}
                    </p>

                    <p className="text-slate-500">
                      {user.contact_no || "No contact number"}
                    </p>
                  </div>

                  <RoleBadges roles={user.roles} />

                  <UserActions
                    target={user}
                    actor={actor}
                    onEdit={(target) =>
                      setDialog({
                        type: "form",
                        user: target,
                      })
                    }
                    onAccess={(target) =>
                      setDialog({
                        type: "access",
                        user: target,
                      })
                    }
                    onDelete={(target) =>
                      setDialog({
                        type: "delete",
                        user: target,
                      })
                    }
                  />
                </article>
              ))}
            </div>
          </>
        )}

        {/* PAGINATION */}
        {!loading && meta.total > 0 && (
          <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Showing {from}–{to} of {meta.total} users
            </p>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-lg border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={18} />
              </button>

              <span className="text-xs font-medium text-slate-600">
                Page {meta.current_page} of {meta.last_page}
              </span>

              <button
                type="button"
                aria-label="Next page"
                disabled={page >= meta.last_page}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-lg border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* DIALOGS */}
      {dialog?.type === "form" && (
        <UserFormDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onSaved={reload}
        />
      )}

      {dialog?.type === "access" && (
        <UserAccessDialog
          user={dialog.user}
          actor={actor}
          onClose={() => setDialog(null)}
          onSaved={reload}
        />
      )}

      {dialog?.type === "delete" && (
        <DeleteUserDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}
