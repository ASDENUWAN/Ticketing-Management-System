import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Layers3,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Ticket,
  Trash2,
  UsersRound,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { can } from "../../utils/permissions";
import useTimedMessage from "../../hooks/useTimedMessage";
import Modal from "../../components/ui/Modal";

import { permissionsApi, permissionApiError } from "./permissionsApi";

/*
|--------------------------------------------------------------------------
| Core permissions
|--------------------------------------------------------------------------
|
| These are protected by RolePermissionGuard
| on the Laravel backend.
|
*/

const CORE_PERMISSIONS = new Set([
  "users.view",
  "users.create",
  "users.update",
  "users.delete",

  "roles.view",
  "roles.create",
  "roles.update",
  "roles.delete",
  "roles.assign",

  "permissions.view",
  "permissions.create",
  "permissions.update",
  "permissions.delete",
  "permissions.assign",

  "profile.update",
]);

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function groupPermissions(permissions) {
  const groups = new Map();

  for (const permission of permissions) {
    const moduleName = permission.name.split(".")[0] || "other";

    if (!groups.has(moduleName)) {
      groups.set(moduleName, []);
    }

    groups.get(moduleName).push(permission);
  }

  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function formatModuleName(name) {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getModuleIcon(name) {
  const icons = {
    users: UsersRound,
    roles: ShieldCheck,
    permissions: KeyRound,
    tickets: Ticket,
  };

  return icons[name] ?? Layers3;
}

/*
|--------------------------------------------------------------------------
| Create Permission Dialog
|--------------------------------------------------------------------------
*/

function CreatePermissionDialog({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [busy, setBusy] = useState(false);

  const errorNotice = useTimedMessage(30000);

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy) return;

    errorNotice.clear();
    setFieldError("");

    const value = name.trim().toLowerCase();

    if (!value) {
      setFieldError("Permission name is required.");
      return;
    }

    const pattern = /^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)+$/;

    if (!pattern.test(value)) {
      setFieldError("Use module.action format, such as tickets.view.");
      return;
    }

    if (value.length > 100) {
      setFieldError("Maximum length is 100 characters.");
      return;
    }

    setBusy(true);

    try {
      const response = await permissionsApi.create(value);

      onCreated(response.data);
      onClose();
    } catch (error) {
      setFieldError(error.response?.data?.errors?.name?.[0] ?? "");

      errorNotice.show(permissionApiError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Create Permission"
      description="Register a new system permission."
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorNotice.message && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {errorNotice.message}
          </div>
        )}

        <div>
          <label
            htmlFor="permission-name"
            className="block text-sm font-semibold text-slate-700"
          >
            Permission name *
          </label>

          <div className="relative mt-2">
            <KeyRound
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="permission-name"
              type="text"
              autoFocus
              autoComplete="off"
              maxLength={100}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setFieldError("");
              }}
              placeholder="e.g. tickets.view"
              aria-invalid={Boolean(fieldError)}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-red-100"
              required
            />
          </div>

          {fieldError && (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {fieldError}
            </p>
          )}

          <p className="mt-2 text-xs leading-6 text-slate-500">
            Use lowercase names with the format module.action.
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Examples
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              "tickets.view",
              "tickets.create",
              "systems.manage",
              "reports.export",
            ].map((example) => (
              <span
                key={example}
                className="rounded-lg bg-white px-2.5 py-1.5 font-mono text-xs text-slate-700 ring-1 ring-slate-200"
              >
                {example}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
          Creating a permission does not automatically grant it to a role or
          user. Assign it separately through Role Management or User Management.
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
          >
            <Plus size={17} />

            {busy ? "Creating..." : "Create permission"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/*
|--------------------------------------------------------------------------
| Delete Permission Dialog
|--------------------------------------------------------------------------
*/

function DeletePermissionDialog({ permission, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const errorNotice = useTimedMessage(30000);

  async function handleDelete() {
    if (busy) return;

    setBusy(true);
    errorNotice.clear();

    try {
      await permissionsApi.remove(permission.id);

      onDeleted(permission.name);
      onClose();
    } catch (error) {
      errorNotice.show(permissionApiError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Delete Permission"
      description="Confirm the permission you want to delete."
      onClose={onClose}
      busy={busy}
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={22} className="shrink-0 text-red-700" />

          <div>
            <p className="text-sm leading-6 text-red-900">
              You are about to delete:
            </p>

            <p className="mt-2 break-all font-mono text-sm font-semibold text-red-900">
              {permission.name}
            </p>
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-600">
          This action cannot be undone. Permissions assigned to users or roles
          must be unassigned before deletion.
        </p>

        {errorNotice.message && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {errorNotice.message}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
          >
            <Trash2 size={17} />

            {busy ? "Deleting..." : "Delete permission"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/*
|--------------------------------------------------------------------------
| Permission Row
|--------------------------------------------------------------------------
*/

function PermissionItem({ permission, actor, onDelete }) {
  const isCore = CORE_PERMISSIONS.has(permission.name);

  const canDelete = !isCore && can(actor, "permissions.delete");

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-lg bg-slate-100 p-2 text-slate-600">
          <KeyRound size={17} />
        </div>

        <div className="min-w-0">
          <p className="break-all font-mono text-sm font-medium text-slate-800">
            {permission.name}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Permission ID: {permission.id}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-11 sm:pl-0">
        {isCore ? (
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
            Protected
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            Custom
          </span>
        )}

        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(permission)}
            aria-label={`Delete ${permission.name}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 size={15} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Permission Group
|--------------------------------------------------------------------------
*/

function PermissionGroup({ moduleName, permissions, actor, onDelete }) {
  const Icon = getModuleIcon(moduleName);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-xl bg-red-50 p-2.5 text-brand">
            <Icon size={20} />
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              {formatModuleName(moduleName)}
            </h3>

            <p className="text-xs text-slate-500">Permission group</p>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {permissions.length}
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {permissions.map((permission) => (
          <PermissionItem
            key={permission.id}
            permission={permission}
            actor={actor}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

/*
|--------------------------------------------------------------------------
| Main Permissions Page
|--------------------------------------------------------------------------
*/

export default function PermissionsPage() {
  const { user: actor, refreshUser } = useAuth();

  const [permissions, setPermissions] = useState([]);

  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 50,
    total: 0,
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [dialog, setDialog] = useState(null);

  const notice = useTimedMessage(30000);
  const errorNotice = useTimedMessage(30000);

  const showError = errorNotice.show;
  const clearError = errorNotice.clear;

  /*
   * Debounced server-side search
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearchTerm(search.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  /*
   * Fetch permissions from Laravel
   */
  useEffect(() => {
    const controller = new AbortController();

    async function loadPermissions() {
      setLoading(true);
      setLoadFailed(false);
      clearError();

      try {
        const response = await permissionsApi.list({
          page,
          search: searchTerm,
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        const nextMeta = {
          current_page: Number(response.meta?.current_page ?? 1),

          last_page: Math.max(1, Number(response.meta?.last_page ?? 1)),

          per_page: Number(response.meta?.per_page ?? 50),

          total: Number(response.meta?.total ?? 0),
        };

        if (page > 1 && page > nextMeta.last_page) {
          setPage(nextMeta.last_page);
          return;
        }

        setPermissions(Array.isArray(response.data) ? response.data : []);

        setMeta(nextMeta);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setPermissions([]);
        setLoadFailed(true);

        showError(permissionApiError(error));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPermissions();

    return () => controller.abort();
  }, [page, searchTerm, refreshKey, showError, clearError]);

  const groups = useMemo(() => groupPermissions(permissions), [permissions]);

  /*
   * Refresh after a mutation
   */
  function reload() {
    setRefreshKey((value) => value + 1);
    void refreshUser();
  }

  function handleCreated(permission) {
    notice.show(`Permission "${permission.name}" created successfully.`);

    setSearch(permission.name);
    setSearchTerm(permission.name);
    setPage(1);

    reload();
  }

  function handleDeleted(name) {
    notice.show(`Permission "${name}" deleted successfully.`);

    reload();
  }

  const from = meta.total > 0 ? (meta.current_page - 1) * meta.per_page + 1 : 0;

  const to =
    meta.total > 0 ? Math.min(from + permissions.length - 1, meta.total) : 0;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Permission Management
          </h1>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Create and manage access permissions for USJ CITS Desk.
          </p>
        </div>

        {can(actor, "permissions.create") && (
          <button
            type="button"
            onClick={() => setDialog({ type: "create" })}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep"
          >
            <Plus size={18} />
            Create permission
          </button>
        )}
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-red-50 p-3 text-brand">
            <KeyRound size={24} />
          </div>

          <div>
            <p className="text-xs text-slate-500">
              {searchTerm ? "Matching permissions" : "Total permissions"}
            </p>

            <p className="mt-1 text-2xl font-bold">{meta.total}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-amber-50 p-3 text-amber-800">
            <Layers3 size={24} />
          </div>

          <div>
            <p className="text-xs text-slate-500">Modules on this page</p>

            <p className="mt-1 text-2xl font-bold">{groups.length}</p>
          </div>
        </div>
      </div>

      {/* SUCCESS NOTIFICATION */}
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

      {/* ERROR NOTIFICATION */}
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

      {/* SEARCH BAR */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search permissions"
              placeholder="Search permissions..."
              maxLength={100}
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-red-100"
            />
          </div>

          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      {/* PERMISSION GROUPS */}
      {loading ? (
        <div
          role="status"
          className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white"
        >
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-red-100 border-t-brand" />

          <p className="text-sm text-slate-500">Loading permissions...</p>
        </div>
      ) : loadFailed ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
          <KeyRound size={32} className="mx-auto text-slate-400" />

          <h3 className="mt-4 font-semibold">Unable to load permissions</h3>

          <p className="mt-2 text-sm text-slate-500">
            Check the Laravel server and refresh.
          </p>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
          <KeyRound size={32} className="mx-auto text-slate-400" />

          <h3 className="mt-4 font-semibold">No permissions found</h3>

          <p className="mt-2 text-sm text-slate-500">
            {searchTerm
              ? "Try a different search."
              : "No permissions have been registered yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([moduleName, items]) => (
            <PermissionGroup
              key={moduleName}
              moduleName={moduleName}
              permissions={items}
              actor={actor}
              onDelete={(permission) =>
                setDialog({
                  type: "delete",
                  permission,
                })
              }
            />
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {!loading && !loadFailed && meta.total > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Showing {from}–{to} of {meta.total} permissions
          </p>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50 disabled:opacity-40"
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
              className="rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      <p className="text-xs leading-6 text-slate-500">
        Core permissions are protected. Permissions already assigned to users or
        roles cannot be deleted until those assignments are removed.
      </p>

      {/* CREATE DIALOG */}
      {dialog?.type === "create" && (
        <CreatePermissionDialog
          onClose={() => setDialog(null)}
          onCreated={handleCreated}
        />
      )}

      {/* DELETE DIALOG */}
      {dialog?.type === "delete" && (
        <DeletePermissionDialog
          permission={dialog.permission}
          onClose={() => setDialog(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
