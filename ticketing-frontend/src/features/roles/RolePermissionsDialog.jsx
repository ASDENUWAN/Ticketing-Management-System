import { useEffect, useMemo, useState } from "react";

import { CheckCircle2, KeyRound, Search } from "lucide-react";

import Modal from "../../components/ui/Modal";
import useTimedMessage from "../../hooks/useTimedMessage";

import { rolesApi, roleApiError } from "./rolesApi";

function groupPermissions(permissions) {
  const groups = {};

  for (const permission of permissions) {
    const moduleName = permission.name.split(".")[0] || "other";

    if (!groups[moduleName]) {
      groups[moduleName] = [];
    }

    groups[moduleName].push(permission);
  }

  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function sameIds(a, b) {
  if (a.length !== b.length) return false;

  const ids = new Set(a);

  return b.every((id) => ids.has(id));
}

export default function RolePermissionsDialog({
  role,
  actor,
  onClose,
  onSaved,
}) {
  const [permissions, setPermissions] = useState([]);

  const [selected, setSelected] = useState([]);
  const [original, setOriginal] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [saving, setSaving] = useState(false);

  const errorNotice = useTimedMessage();

  const actorPermissionKey = (actor?.permissions ?? []).join("|");

  /**
   * Fetch the role's latest saved permissions.
   */
  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setLoadFailed(false);
      errorNotice.clear();

      try {
        const [currentRole, allPermissions] = await Promise.all([
          rolesApi.get(role.id),
          rolesApi.allPermissions(),
        ]);

        if (!active) return;

        // Super Admin may delegate all permissions.
        const allowed = actor?.is_super_admin
          ? allPermissions
          : allPermissions.filter((permission) =>
              actor?.permissions?.includes(permission.name),
            );

        const currentIds = (currentRole.permissions ?? []).map((permission) =>
          Number(permission.id),
        );

        const allowedIds = new Set(
          allowed.map((permission) => Number(permission.id)),
        );

        const inaccessible = currentIds.some((id) => !allowedIds.has(id));

        if (inaccessible) {
          setLoadFailed(true);

          errorNotice.show(
            "This role has permissions outside your authority. Contact a Super Admin.",
          );

          return;
        }

        setPermissions(allowed);
        setSelected(currentIds);
        setOriginal(currentIds);
      } catch (err) {
        if (active) {
          setLoadFailed(true);
          errorNotice.show(roleApiError(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [role.id, actorPermissionKey, actor?.is_super_admin]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return permissions;

    return permissions.filter((permission) =>
      permission.name.toLowerCase().includes(term),
    );
  }, [permissions, search]);

  const groups = useMemo(() => groupPermissions(filtered), [filtered]);

  const changed = !sameIds(selected, original);

  function toggle(id) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function handleSave() {
    if (saving || loading || loadFailed || !changed) {
      return;
    }

    setSaving(true);
    errorNotice.clear();

    try {
      await rolesApi.syncPermissions(role.id, selected);

      onSaved("Role permissions updated successfully.");

      // Close automatically after successful save.
      onClose();
    } catch (err) {
      errorNotice.show(roleApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Manage role permissions"
      description={`Assign permissions to ${role.name}.`}
      onClose={onClose}
      busy={saving}
    >
      <div className="space-y-5">
        {errorNotice.message && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800"
          >
            {errorNotice.message}
          </div>
        )}

        {loading ? (
          <div
            role="status"
            className="py-12 text-center text-sm text-slate-500"
          >
            Loading permissions...
          </div>
        ) : loadFailed ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Permission information could not be loaded. Close the dialog and try
            again.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <KeyRound size={19} className="text-brand" />

                <span className="text-sm font-medium text-slate-800">
                  Selected permissions
                </span>
              </div>

              <span className="text-sm font-bold text-brand">
                {selected.length}
              </span>
            </div>

            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                aria-label="Search permissions"
                placeholder="Search permissions..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
              {groups.length ? (
                groups.map(([moduleName, items]) => (
                  <section
                    key={moduleName}
                    className="overflow-hidden rounded-xl border border-slate-200"
                  >
                    <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold capitalize text-slate-800">
                      {moduleName.replace(/[-_]/g, " ")}
                    </h3>

                    <div className="divide-y divide-slate-100">
                      {items.map((permission) => {
                        const id = Number(permission.id);

                        return (
                          <label
                            key={id}
                            className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={selected.includes(id)}
                              onChange={() => toggle(id)}
                              disabled={saving}
                              className="h-4 w-4 shrink-0 accent-[#8A0007]"
                            />

                            <span className="break-all text-sm text-slate-700">
                              {permission.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                ))
              ) : (
                <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No permissions found.
                </p>
              )}
            </div>

            {changed && (
              <p className="flex items-center gap-2 text-xs text-amber-800">
                <CheckCircle2 size={16} />
                You have unsaved changes.
              </p>
            )}

            <p className="text-xs leading-6 text-slate-500">
              Saving replaces the role's existing permissions with the selected
              set. This affects every user assigned to the role.
            </p>
          </>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || loadFailed || !changed}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save permissions"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
