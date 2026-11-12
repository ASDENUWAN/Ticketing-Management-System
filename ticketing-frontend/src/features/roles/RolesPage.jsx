import { useEffect, useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { can } from "../../utils/permissions";
import useTimedMessage from "../../hooks/useTimedMessage";

import { rolesApi, roleApiError } from "./rolesApi";

import RoleFormDialog from "./RoleFormDialog";
import RolePermissionsDialog from "./RolePermissionsDialog";
import DeleteRoleDialog from "./DeleteRoleDialog";

function RoleCard({ role, actor, onEdit, onPermissions, onDelete }) {
  const isProtected = role.name.toLowerCase() === "super admin";

  const permissions = role.permissions ?? [];

  const manageable =
    actor?.is_super_admin ||
    permissions.every((permission) =>
      actor?.permissions?.includes(permission.name),
    );

  const canEdit = !isProtected && manageable && can(actor, "roles.update");

  const canAssign =
    canEdit &&
    can(actor, "permissions.assign") &&
    can(actor, "permissions.view");

  const canDelete = !isProtected && manageable && can(actor, "roles.delete");

  const actionClass =
    "inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand";

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={
              isProtected
                ? "rounded-xl bg-amber-50 p-3 text-amber-800"
                : "rounded-xl bg-red-50 p-3 text-brand"
            }
          >
            <Shield size={22} />
          </div>

          <div className="min-w-0">
            <h3 className="break-words text-base font-semibold">{role.name}</h3>

            <p className="mt-1 text-xs text-slate-500">
              {isProtected
                ? "Unrestricted authorization"
                : `${permissions.length} permissions`}
            </p>
          </div>
        </div>

        {isProtected && (
          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
            Protected
          </span>
        )}
      </div>

      <div className="mt-5 min-h-20">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Permissions
        </p>

        {isProtected ? (
          <p className="text-sm leading-6 text-slate-600">
            Full system access through Laravel authorization.
          </p>
        ) : permissions.length ? (
          <div className="flex flex-wrap gap-2">
            {permissions.slice(0, 3).map((permission) => (
              <span
                key={permission.id}
                className="max-w-full break-all rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700"
              >
                {permission.name}
              </span>
            ))}

            {permissions.length > 3 && (
              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-500">
                +{permissions.length - 3} more
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No permissions assigned.</p>
        )}
      </div>

      <div className="mt-auto border-t border-slate-100 pt-4">
        {isProtected ? (
          <p className="text-xs text-slate-500">
            This system role cannot be modified.
          </p>
        ) : !manageable ? (
          <p className="text-xs leading-5 text-amber-800">
            You cannot manage this role because it contains permissions outside
            your access.
          </p>
        ) : canEdit || canDelete ? (
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(role)}
                className={actionClass}
              >
                <Pencil size={15} />
                Edit
              </button>
            )}

            {canAssign && (
              <button
                type="button"
                onClick={() => onPermissions(role)}
                className={actionClass}
              >
                <KeyRound size={15} />
                Permissions
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(role)}
                className={`${actionClass} hover:border-red-200 hover:bg-red-50 hover:text-red-700`}
              >
                <Trash2 size={15} />
                Delete
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">View-only access.</p>
        )}
      </div>
    </article>
  );
}

export default function RolesPage() {
  const { user: actor, refreshUser } = useAuth();

  const [roles, setRoles] = useState([]);

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

  const [dialog, setDialog] = useState(null);

  const notice = useTimedMessage();
  const errorNotice = useTimedMessage();

  /**
   * Search with debounce.
   */
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearchTerm(search.trim());
    }, 350);

    return () => clearTimeout(timeout);
  }, [search]);

  /**
   * Fetch latest roles from backend.
   */
  useEffect(() => {
    const controller = new AbortController();

    async function loadRoles() {
      setLoading(true);
      errorNotice.clear();

      try {
        const response = await rolesApi.list({
          page,
          search: searchTerm,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const newMeta = response.meta ?? {
          current_page: 1,
          last_page: 1,
          per_page: 20,
          total: 0,
        };

        if (page > 1 && page > newMeta.last_page) {
          setPage(newMeta.last_page);
          return;
        }

        setRoles(response.data ?? []);
        setMeta(newMeta);
      } catch (err) {
        if (controller.signal.aborted) return;

        setRoles([]);
        errorNotice.show(roleApiError(err));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRoles();

    return () => controller.abort();
  }, [page, searchTerm, refresh]);

  /**
   * Refresh role list and authenticated access.
   */
  function reload(message = "") {
    if (message) {
      notice.show(message);
    }

    setRefresh((current) => current + 1);
    refreshUser();
  }

  function handleDeleted(message) {
    notice.show(message);

    if (roles.length === 1 && page > 1) {
      setPage((current) => current - 1);
    } else {
      setRefresh((current) => current + 1);
    }

    refreshUser();
  }

  const from = meta.total ? (meta.current_page - 1) * meta.per_page + 1 : 0;

  const to = meta.total ? Math.min(from + roles.length - 1, meta.total) : 0;

  return (
    <div className="space-y-6">
      {/* PAGE HEADING */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Role Management</h1>

          <p className="mt-1 text-sm text-slate-500">
            Create roles and manage access to USJ CITS Desk.
          </p>
        </div>

        {can(actor, "roles.create") && (
          <button
            type="button"
            onClick={() =>
              setDialog({
                type: "form",
                role: null,
              })
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-deep"
          >
            <Plus size={18} />
            Create role
          </button>
        )}
      </div>

      {/* OVERVIEW */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-red-50 p-3 text-brand">
            <ShieldCheck size={24} />
          </div>

          <div>
            <p className="text-xs text-slate-500">
              {searchTerm ? "Matching roles" : "Total roles"}
            </p>

            <p className="mt-1 text-2xl font-bold">{meta.total}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-amber-50 p-3 text-amber-800">
            <KeyRound size={24} />
          </div>

          <div>
            <p className="text-xs text-slate-500">Authorization model</p>

            <p className="mt-1 text-sm font-semibold">Dynamic RBAC</p>

            <p className="text-xs text-slate-500">
              Laravel + Spatie Permission
            </p>
          </div>
        </div>
      </div>

      {/* AUTOMATIC NOTIFICATIONS */}
      {notice.message && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <span>{notice.message}</span>

          <button
            type="button"
            onClick={notice.clear}
            className="font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorNotice.message && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{errorNotice.message}</span>

          <button
            type="button"
            onClick={errorNotice.clear}
            className="font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ROLE LIST */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              aria-label="Search roles"
              placeholder="Search role names..."
              value={search}
              maxLength={80}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-red-100"
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

        <div className="mt-6">
          {loading ? (
            <div
              role="status"
              className="flex min-h-56 flex-col items-center justify-center gap-3"
            >
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-red-100 border-t-brand" />

              <p className="text-sm text-slate-500">Loading roles...</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-5 py-12 text-center">
              <Shield size={32} className="mx-auto text-slate-400" />

              <h3 className="mt-4 font-semibold">
                {errorNotice.message
                  ? "Unable to load roles"
                  : "No roles found"}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Try another search or refresh the page.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {roles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  actor={actor}
                  onEdit={(selected) =>
                    setDialog({
                      type: "form",
                      role: selected,
                    })
                  }
                  onPermissions={(selected) =>
                    setDialog({
                      type: "permissions",
                      role: selected,
                    })
                  }
                  onDelete={(selected) =>
                    setDialog({
                      type: "delete",
                      role: selected,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* PAGINATION */}
        {!loading && meta.total > 0 && (
          <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Showing {from}–{to} of {meta.total} roles
            </p>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-lg border border-slate-200 p-2.5 disabled:opacity-40"
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
                className="rounded-lg border border-slate-200 p-2.5 disabled:opacity-40"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* DIALOGS */}
      {dialog?.type === "form" && (
        <RoleFormDialog
          role={dialog.role}
          onClose={() => setDialog(null)}
          onSaved={reload}
        />
      )}

      {dialog?.type === "permissions" && (
        <RolePermissionsDialog
          role={dialog.role}
          actor={actor}
          onClose={() => setDialog(null)}
          onSaved={reload}
        />
      )}

      {dialog?.type === "delete" && (
        <DeleteRoleDialog
          role={dialog.role}
          onClose={() => setDialog(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
