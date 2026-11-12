import { useEffect, useMemo, useState } from "react";

import { KeyRound, ShieldCheck, Search } from "lucide-react";

import Modal from "../../components/ui/Modal";
import { can } from "../../utils/permissions";
import useTimedMessage from "../../hooks/useTimedMessage";

import { usersApi, apiErrorMessage } from "./usersApi";

function sameIds(a, b) {
  if (a.length !== b.length) return false;

  const set = new Set(a);

  return b.every((id) => set.has(id));
}

export default function UserAccessDialog({ user, actor, onClose, onSaved }) {
  const canManageRoles =
    can(actor, "users.update") &&
    can(actor, "roles.assign") &&
    can(actor, "roles.view");

  const canManagePermissions =
    can(actor, "users.update") &&
    can(actor, "permissions.assign") &&
    can(actor, "permissions.view");

  const [allRoles, setAllRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);

  const [selectedRoles, setSelectedRoles] = useState([]);

  const [originalRoles, setOriginalRoles] = useState([]);

  const [selectedDirectPermissions, setSelectedDirectPermissions] = useState(
    [],
  );

  const [originalDirectPermissions, setOriginalDirectPermissions] = useState(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [saving, setSaving] = useState(null);
  const [permissionSearch, setPermissionSearch] = useState("");

  const errorNotice = useTimedMessage();

  const actorPermissionKey = (actor?.permissions ?? []).join("|");

  /**
   * Load the current user's REAL assignments.
   */
  useEffect(() => {
    let active = true;

    async function loadAccess() {
      setLoading(true);
      setLoadFailed(false);
      errorNotice.clear();

      try {
        const [latestUser, roles, permissions] = await Promise.all([
          usersApi.get(user.id),

          canManageRoles
            ? usersApi.allOptions("/api/roles")
            : Promise.resolve([]),

          canManagePermissions
            ? usersApi.allOptions("/api/permissions")
            : Promise.resolve([]),
        ]);

        if (!active) return;

        const roleIds = (latestUser.roles ?? []).map((role) => Number(role.id));

        const directNames = new Set(latestUser.direct_permissions ?? []);

        const directIds = permissions
          .filter((permission) => directNames.has(permission.name))
          .map((permission) => Number(permission.id));

        setAllRoles(roles);
        setAllPermissions(permissions);

        setSelectedRoles(roleIds);
        setOriginalRoles(roleIds);

        setSelectedDirectPermissions(directIds);
        setOriginalDirectPermissions(directIds);

        // Detect direct permissions not available
        // in the current permission selector.
        const knownNames = new Set(
          permissions.map((permission) => permission.name),
        );

        if (
          canManagePermissions &&
          [...directNames].some((name) => !knownNames.has(name))
        ) {
          throw new Error(
            "Some assigned direct permissions are unavailable. Reload and contact an administrator.",
          );
        }
      } catch (err) {
        if (active) {
          setLoadFailed(true);

          errorNotice.show(
            err.response
              ? apiErrorMessage(err)
              : err.message || "Unable to load access.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAccess();

    return () => {
      active = false;
    };
  }, [
    user.id,
    canManageRoles,
    canManagePermissions,
    actorPermissionKey,
    actor?.is_super_admin,
  ]);

  /**
   * Roles this administrator is allowed to assign.
   */
  const assignableRoles = useMemo(() => {
    return allRoles.filter((role) => {
      if (role.name.toLowerCase() === "super admin") {
        return false;
      }

      if (actor?.is_super_admin) {
        return true;
      }

      return (role.permissions ?? []).every((permission) =>
        actor?.permissions?.includes(permission.name),
      );
    });
  }, [allRoles, actorPermissionKey, actor?.is_super_admin]);

  const assignableRoleIds = useMemo(
    () => new Set(assignableRoles.map((role) => Number(role.id))),
    [assignableRoles],
  );

  const unmanageableRole = originalRoles.some(
    (id) => !assignableRoleIds.has(id),
  );

  /**
   * Collect permissions belonging to
   * CURRENTLY SELECTED ROLES.
   */
  const inheritedByRole = useMemo(() => {
    return allRoles
      .filter((role) => selectedRoles.includes(Number(role.id)))
      .map((role) => ({
        id: role.id,
        name: role.name,
        permissions: role.permissions ?? [],
      }));
  }, [allRoles, selectedRoles]);

  const inheritedNames = useMemo(() => {
    const names = new Set();

    inheritedByRole.forEach((role) => {
      role.permissions.forEach((permission) => {
        names.add(permission.name);
      });
    });

    return names;
  }, [inheritedByRole]);

  /**
   * Direct permissions are NOT automatically
   * checked from role-inherited permissions.
   */
  const assignablePermissions = useMemo(() => {
    if (actor?.is_super_admin) {
      return allPermissions;
    }

    return allPermissions.filter((permission) =>
      actor?.permissions?.includes(permission.name),
    );
  }, [allPermissions, actorPermissionKey, actor?.is_super_admin]);

  const assignablePermissionIds = useMemo(
    () =>
      new Set(assignablePermissions.map((permission) => Number(permission.id))),
    [assignablePermissions],
  );

  const unmanageableDirectPermission = originalDirectPermissions.some(
    (id) => !assignablePermissionIds.has(id),
  );

  /**
   * Hide role-inherited-only permissions
   * from the direct permission selector.
   *
   * If the same permission is ALSO assigned
   * directly, keep it visible and checked.
   */
  const visibleDirectPermissions = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();

    return assignablePermissions.filter((permission) => {
      const isInherited = inheritedNames.has(permission.name);

      const isDirect = selectedDirectPermissions.includes(
        Number(permission.id),
      );

      if (isInherited && !isDirect) {
        return false;
      }

      if (!query) return true;

      return permission.name.toLowerCase().includes(query);
    });
  }, [
    assignablePermissions,
    inheritedNames,
    selectedDirectPermissions,
    permissionSearch,
  ]);

  const rolesChanged = !sameIds(selectedRoles, originalRoles);

  const permissionsChanged = !sameIds(
    selectedDirectPermissions,
    originalDirectPermissions,
  );

  const busy = saving !== null;

  function toggleRole(id) {
    setSelectedRoles((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
  }

  function toggleDirectPermission(id) {
    setSelectedDirectPermissions((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
  }

  /**
   * Save roles and close the dialog.
   */
  async function saveRoles() {
    if (busy || loading || loadFailed || unmanageableRole || !rolesChanged) {
      return;
    }

    setSaving("roles");
    errorNotice.clear();

    try {
      await usersApi.syncRoles(user.id, selectedRoles);

      onSaved("User roles updated successfully.");
      onClose();
    } catch (err) {
      errorNotice.show(apiErrorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  /**
   * Save DIRECT permissions and close.
   */
  async function saveDirectPermissions() {
    if (
      busy ||
      loading ||
      loadFailed ||
      unmanageableDirectPermission ||
      !permissionsChanged
    ) {
      return;
    }

    setSaving("permissions");
    errorNotice.clear();

    try {
      await usersApi.syncPermissions(user.id, selectedDirectPermissions);

      onSaved("Direct permissions updated successfully.");

      onClose();
    } catch (err) {
      errorNotice.show(apiErrorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  return (
    <Modal
      title="Manage user access"
      description={`Configure access for @${user.username}.`}
      onClose={onClose}
      busy={busy}
    >
      <div className="space-y-6">
        {errorNotice.message && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800"
          >
            {errorNotice.message}
          </div>
        )}

        {loading ? (
          <p role="status" className="py-8 text-center text-sm text-slate-500">
            Loading current roles and permissions...
          </p>
        ) : loadFailed ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Access information could not be loaded. Close this dialog and try
            again.
          </div>
        ) : (
          <>
            {/* ASSIGNED ROLES */}
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold">
                  <ShieldCheck size={20} className="text-brand" />
                  Assigned roles
                </h3>

                <span className="text-xs text-slate-500">
                  {selectedRoles.length} selected
                </span>
              </div>

              {canManageRoles ? (
                <>
                  <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                    {assignableRoles.length ? (
                      assignableRoles.map((role) => {
                        const id = Number(role.id);

                        return (
                          <label
                            key={role.id}
                            className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedRoles.includes(id)}
                              onChange={() => toggleRole(id)}
                              disabled={busy || unmanageableRole}
                              className="h-4 w-4 accent-[#8A0007]"
                            />

                            <span className="text-sm text-slate-700">
                              {role.name}
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="p-3 text-sm text-slate-500">
                        No assignable roles available.
                      </p>
                    )}
                  </div>

                  {unmanageableRole && (
                    <p className="mt-2 text-xs leading-5 text-amber-800">
                      This user has a protected or non-delegatable role. You
                      cannot replace their role assignments.
                    </p>
                  )}

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={saveRoles}
                      disabled={busy || !rolesChanged || unmanageableRole}
                      className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
                    >
                      {saving === "roles" ? "Saving..." : "Save roles"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  You cannot modify role assignments.
                </p>
              )}
            </section>

            {/* INHERITED ROLE PERMISSIONS */}
            {canManageRoles && (
              <section className="border-t border-slate-100 pt-5">
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <ShieldCheck size={20} className="text-brand" />
                  Permissions from roles
                </h3>

                <p className="mb-3 text-xs leading-5 text-slate-500">
                  These permissions are inherited automatically from selected
                  roles. They are not direct permissions.
                </p>

                <div className="max-h-56 space-y-3 overflow-y-auto rounded-xl border border-slate-200 p-3">
                  {inheritedByRole.length ? (
                    inheritedByRole.map((role) => (
                      <div key={role.id} className="rounded-lg bg-slate-50 p-3">
                        <p className="mb-2 text-sm font-semibold text-slate-800">
                          {role.name}
                        </p>

                        {role.permissions.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {role.permissions.map((permission) => (
                              <span
                                key={permission.id}
                                className="rounded-md bg-white px-2.5 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200"
                              >
                                {permission.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            No permissions in this role.
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      No inherited role permissions.
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* DIRECT PERMISSIONS */}
            {canManagePermissions && (
              <section className="border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <KeyRound size={20} className="text-brand" />
                    Direct permissions
                  </h3>

                  <span className="text-xs text-slate-500">
                    {selectedDirectPermissions.length} selected
                  </span>
                </div>

                <p className="mb-3 text-xs leading-5 text-slate-500">
                  Only permissions directly assigned to the user are checked
                  here. Role-inherited-only permissions are displayed above.
                </p>

                <div className="relative mb-3">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="search"
                    aria-label="Search direct permissions"
                    value={permissionSearch}
                    onChange={(event) =>
                      setPermissionSearch(event.target.value)
                    }
                    placeholder="Search direct permissions..."
                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                  {visibleDirectPermissions.length ? (
                    visibleDirectPermissions.map((permission) => {
                      const id = Number(permission.id);

                      const alsoInherited = inheritedNames.has(permission.name);

                      return (
                        <label
                          key={permission.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDirectPermissions.includes(id)}
                            onChange={() => toggleDirectPermission(id)}
                            disabled={busy || unmanageableDirectPermission}
                            className="h-4 w-4 shrink-0 accent-[#8A0007]"
                          />

                          <span className="min-w-0 flex-1 break-all text-sm text-slate-700">
                            {permission.name}
                          </span>

                          {alsoInherited && (
                            <span className="text-xs text-slate-400">
                              Also inherited
                            </span>
                          )}
                        </label>
                      );
                    })
                  ) : (
                    <p className="p-3 text-sm text-slate-500">
                      No direct permission options match your search.
                    </p>
                  )}
                </div>

                {unmanageableDirectPermission && (
                  <p className="mt-2 text-xs text-amber-800">
                    This user has direct permissions outside your authority.
                  </p>
                )}

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={saveDirectPermissions}
                    disabled={
                      busy ||
                      !permissionsChanged ||
                      unmanageableDirectPermission
                    }
                    className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
                  >
                    {saving === "permissions"
                      ? "Saving..."
                      : "Save direct permissions"}
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
          Laravel validates every role and permission assignment. Changes take
          effect after saving.
        </p>
      </div>
    </Modal>
  );
}
