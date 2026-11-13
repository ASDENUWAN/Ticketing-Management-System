import { useEffect, useMemo, useState } from "react";

import { KeyRound, ShieldCheck, Search } from "lucide-react";

import Modal from "../../components/ui/Modal";
import { can } from "../../utils/permissions";
import useTimedMessage from "../../hooks/useTimedMessage";

import { usersApi, apiErrorMessage } from "./usersApi";

import ProfileEditAccess from "./ProfileEditAccess";

// Compare two assignment lists regardless of order.
function sameItems(a, b) {
  if (a.length !== b.length) return false;

  const values = new Set(a);

  return b.every((value) => values.has(value));
}

export default function UserAccessDialog({ user, actor, onClose, onSaved }) {
  // -----------------------------------
  // AUTHORIZATION
  // -----------------------------------

  const canManageRoles =
    can(actor, "users.update") &&
    can(actor, "roles.assign") &&
    can(actor, "roles.view");

  const canManagePermissions =
    can(actor, "users.update") &&
    can(actor, "permissions.assign") &&
    can(actor, "permissions.view");

  const isSuperAdmin = actor?.is_super_admin === true;

  const actorPermissions = useMemo(
    () => new Set(actor?.permissions ?? []),
    [actor?.permissions],
  );

  // -----------------------------------
  // STATE
  // -----------------------------------

  const [latestUser, setLatestUser] = useState(null);

  const [roleOptions, setRoleOptions] = useState([]);

  const [permissionOptions, setPermissionOptions] = useState([]);

  const [selectedRoles, setSelectedRoles] = useState([]);

  const [originalRoles, setOriginalRoles] = useState([]);

  const [selectedDirect, setSelectedDirect] = useState([]);

  const [originalDirect, setOriginalDirect] = useState([]);

  const [permissionSearch, setPermissionSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [saving, setSaving] = useState(null);

  const {
    message: error,
    show: showError,
    clear: clearError,
  } = useTimedMessage(30000);

  const busy = saving !== null;

  // -----------------------------------
  // LOAD CURRENT ACCESS
  // -----------------------------------

  useEffect(() => {
    let active = true;

    async function loadAccess() {
      setLoading(true);
      setLoadFailed(false);
      clearError();

      try {
        const [savedUser, roles, permissions] = await Promise.all([
          // Always fetch latest assignments.
          usersApi.get(user.id),

          canManageRoles
            ? usersApi.allOptions("/api/roles")
            : Promise.resolve([]),

          canManagePermissions
            ? usersApi.allOptions("/api/permissions")
            : Promise.resolve([]),
        ]);

        if (!active) return;

        // Actual role IDs saved in Laravel.
        const roleIds = (savedUser.roles ?? []).map((role) => Number(role.id));

        // Actual DIRECT permission names.
        const directNames = (savedUser.direct_permissions ?? []).map(String);

        setLatestUser(savedUser);

        setRoleOptions(roles);
        setPermissionOptions(permissions);

        // Preselect already assigned roles.
        setSelectedRoles(roleIds);
        setOriginalRoles(roleIds);

        // Preselect already assigned direct permissions.
        setSelectedDirect(directNames);
        setOriginalDirect(directNames);
      } catch (err) {
        if (!active) return;

        setLoadFailed(true);

        showError(
          err.response
            ? apiErrorMessage(err)
            : err.message || "Unable to load user access.",
        );
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
  }, [user.id, canManageRoles, canManagePermissions, clearError, showError]);

  // -----------------------------------
  // MERGE AVAILABLE + ASSIGNED ROLES
  // -----------------------------------

  const roles = useMemo(() => {
    const roleMap = new Map();

    // Available roles from role API.
    for (const role of roleOptions) {
      roleMap.set(Number(role.id), {
        ...role,
        id: Number(role.id),
        available: true,
      });
    }

    // Include saved roles even when the current
    // administrator cannot assign them.
    for (const assigned of latestUser?.roles ?? []) {
      const id = Number(assigned.id);
      const existing = roleMap.get(id);

      roleMap.set(id, {
        ...assigned,
        ...existing,
        id,

        permissions: assigned.permissions ?? existing?.permissions ?? [],

        available: Boolean(existing),
      });
    }

    return Array.from(roleMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [roleOptions, latestUser]);

  const roleById = useMemo(
    () => new Map(roles.map((role) => [role.id, role])),
    [roles],
  );

  // -----------------------------------
  // ROLE EDITING AUTHORIZATION
  // -----------------------------------

  function canEditRole(role) {
    if (!role || !canManageRoles) {
      return false;
    }

    if (!role.available) {
      return false;
    }

    // Never assign protected Super Admin role.
    if (role.name.toLowerCase() === "super admin") {
      return false;
    }

    if (isSuperAdmin) {
      return true;
    }

    return (role.permissions ?? []).every((permission) =>
      actorPermissions.has(permission.name),
    );
  }

  // Display assigned roles even when locked.
  const visibleRoles = roles.filter((role) => {
    const assigned = selectedRoles.includes(role.id);

    if (assigned) {
      return true;
    }

    return canEditRole(role);
  });

  // -----------------------------------
  // ROLE-INHERITED PERMISSIONS
  // -----------------------------------

  const inheritedByRole = useMemo(() => {
    return selectedRoles.map((id) => roleById.get(id)).filter(Boolean);
  }, [selectedRoles, roleById]);

  const inheritedNames = useMemo(() => {
    const names = new Set();

    for (const role of inheritedByRole) {
      for (const permission of role.permissions ?? []) {
        names.add(permission.name);
      }
    }

    return names;
  }, [inheritedByRole]);

  // -----------------------------------
  // MERGE AVAILABLE + DIRECT PERMISSIONS
  // -----------------------------------

  const permissions = useMemo(() => {
    const permissionMap = new Map();

    // Permissions available from API.
    for (const permission of permissionOptions) {
      permissionMap.set(permission.name, {
        ...permission,
        id: Number(permission.id),
        available: true,
      });
    }

    // Include permissions already assigned directly,
    // even if unavailable in the selectable list.
    for (const assigned of latestUser?.direct_permission_items ?? []) {
      const existing = permissionMap.get(assigned.name);

      permissionMap.set(assigned.name, {
        ...assigned,
        ...existing,

        id: Number(existing?.id ?? assigned.id),

        available: Boolean(existing),
      });
    }

    // Compatibility with name-based responses.
    for (const name of latestUser?.direct_permissions ?? []) {
      if (!permissionMap.has(name)) {
        permissionMap.set(name, {
          id: null,
          name,
          available: false,
        });
      }
    }

    return Array.from(permissionMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [permissionOptions, latestUser]);

  const permissionByName = useMemo(
    () =>
      new Map(permissions.map((permission) => [permission.name, permission])),
    [permissions],
  );

  // -----------------------------------
  // DIRECT PERMISSION AUTHORIZATION
  // -----------------------------------

  function canEditPermission(permission) {
    if (!permission || !canManagePermissions) {
      return false;
    }

    if (!permission.available) {
      return false;
    }

    if (!Number.isInteger(permission.id) || permission.id <= 0) {
      return false;
    }

    if (isSuperAdmin) {
      return true;
    }

    return actorPermissions.has(permission.name);
  }

  // -----------------------------------
  // DIRECT PERMISSION FILTER
  // -----------------------------------

  const visibleDirectPermissions = permissions.filter((permission) => {
    const isDirect = selectedDirect.includes(permission.name);

    const isInherited = inheritedNames.has(permission.name);

    // Role-only inherited permissions must
    // NOT appear in direct permission list.
    if (isInherited && !isDirect) {
      return false;
    }

    // Always show assigned direct permissions.
    if (!isDirect && !canEditPermission(permission)) {
      return false;
    }

    const query = permissionSearch.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return permission.name.toLowerCase().includes(query);
  });

  // -----------------------------------
  // PROTECTED ACCOUNTS
  // -----------------------------------

  const targetProtected =
    latestUser?.is_super_admin === true ||
    Number(latestUser?.id) === Number(actor?.id);

  const targetOutsideAuthority =
    !isSuperAdmin &&
    (latestUser?.effective_permissions ?? []).some(
      (permission) => !actorPermissions.has(permission),
    );

  const cannotManageTarget = targetProtected || targetOutsideAuthority;

  // -----------------------------------
  // LOCKED ASSIGNMENTS
  // -----------------------------------

  const lockedAssignedRole = originalRoles.some(
    (id) => !canEditRole(roleById.get(id)),
  );

  const lockedDirectPermission = originalDirect.some(
    (name) => !canEditPermission(permissionByName.get(name)),
  );

  // -----------------------------------
  // DETECT UNSAVED CHANGES
  // -----------------------------------

  const rolesChanged = !sameItems(selectedRoles, originalRoles);

  const permissionsChanged = !sameItems(selectedDirect, originalDirect);

  // -----------------------------------
  // TOGGLE ROLE
  // -----------------------------------

  function toggleRole(id) {
    setSelectedRoles((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
  }

  // -----------------------------------
  // TOGGLE DIRECT PERMISSION
  // -----------------------------------

  function toggleDirectPermission(name) {
    setSelectedDirect((previous) =>
      previous.includes(name)
        ? previous.filter((value) => value !== name)
        : [...previous, name],
    );
  }

  // -----------------------------------
  // SAVE ROLES
  // -----------------------------------

  async function saveRoles() {
    if (
      busy ||
      loading ||
      loadFailed ||
      !canManageRoles ||
      cannotManageTarget ||
      lockedAssignedRole ||
      !rolesChanged
    ) {
      return;
    }

    setSaving("roles");
    clearError();

    try {
      await usersApi.syncRoles(user.id, selectedRoles);

      onSaved("User roles updated successfully.");

      // Close dialog on success.
      onClose();
    } catch (err) {
      showError(apiErrorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  // -----------------------------------
  // SAVE DIRECT PERMISSIONS
  // -----------------------------------

  async function saveDirectPermissions() {
    if (
      busy ||
      loading ||
      loadFailed ||
      !canManagePermissions ||
      cannotManageTarget ||
      lockedDirectPermission ||
      !permissionsChanged
    ) {
      return;
    }

    // Convert selected permission names to IDs.
    const permissionIds = selectedDirect.map(
      (name) => permissionByName.get(name)?.id,
    );

    const invalidIds = permissionIds.some(
      (id) => !Number.isInteger(id) || id <= 0,
    );

    if (invalidIds) {
      showError(
        "Some permissions could not be identified. Close and reopen the dialog.",
      );
      return;
    }

    setSaving("permissions");
    clearError();

    try {
      await usersApi.syncPermissions(user.id, permissionIds);

      onSaved("Direct permissions updated successfully.");

      // Close dialog on success.
      onClose();
    } catch (err) {
      showError(apiErrorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  // -----------------------------------
  // UI
  // -----------------------------------

  return (
    <Modal
      title="Manage user access"
      description={`Configure access for @${user.username}.`}
      onClose={onClose}
      busy={busy}
    >
      <div className="space-y-6">
        {/* ERROR NOTIFICATION */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800"
          >
            {error}
          </div>
        )}

        {loading ? (
          <p role="status" className="py-8 text-center text-sm text-slate-500">
            Loading current roles and permissions...
          </p>
        ) : loadFailed ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Access information could not be loaded. Close the dialog and try
            again.
          </div>
        ) : (
          <>
            {/* ================================ */}
            {/* ASSIGNED ROLES                   */}
            {/* ================================ */}

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

              <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {visibleRoles.length ? (
                  visibleRoles.map((role) => {
                    const checked = selectedRoles.includes(role.id);

                    const editable = canEditRole(role) && !cannotManageTarget;

                    return (
                      <label
                        key={role.id}
                        className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRole(role.id)}
                          disabled={busy || !editable}
                          className="h-4 w-4 accent-[#8A0007]"
                        />

                        <span className="min-w-0 flex-1 text-sm text-slate-700">
                          {role.name}
                        </span>

                        {!editable && (
                          <span className="text-xs text-slate-400">
                            {role.name.toLowerCase() === "super admin"
                              ? "Protected"
                              : "Restricted"}
                          </span>
                        )}
                      </label>
                    );
                  })
                ) : (
                  <p className="p-3 text-sm text-slate-500">
                    No roles available.
                  </p>
                )}
              </div>

              {lockedAssignedRole && (
                <p className="mt-3 text-xs leading-5 text-amber-800">
                  An assigned role is protected or outside your authority. It
                  remains visible but cannot be changed.
                </p>
              )}

              {cannotManageTarget && (
                <p className="mt-3 text-xs leading-5 text-amber-800">
                  You cannot modify this account with your current access.
                </p>
              )}

              {canManageRoles && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={saveRoles}
                    disabled={
                      busy ||
                      !rolesChanged ||
                      lockedAssignedRole ||
                      cannotManageTarget
                    }
                    className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
                  >
                    {saving === "roles" ? "Saving..." : "Save roles"}
                  </button>
                </div>
              )}
            </section>

            {/* ================================ */}
            {/* PERMISSIONS FROM ROLES           */}
            {/* ================================ */}

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

                      {role.name.toLowerCase() === "super admin" ? (
                        <p className="text-xs text-slate-600">
                          Full system access
                        </p>
                      ) : role.permissions?.length ? (
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
                          No permissions assigned to this role.
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

            {/* ================================ */}
            {/* DIRECT PERMISSIONS               */}
            {/* ================================ */}

            <section className="border-t border-slate-100 pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold">
                  <KeyRound size={20} className="text-brand" />
                  Direct permissions
                </h3>

                <span className="text-xs text-slate-500">
                  {selectedDirect.length} selected
                </span>
              </div>

              <p className="mb-3 text-xs leading-5 text-slate-500">
                Only directly assigned permissions are checked here. Permissions
                inherited only from roles are displayed above.
              </p>

              {/* SEARCH */}
              <div className="relative mb-3">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  aria-label="Search direct permissions"
                  value={permissionSearch}
                  onChange={(event) => setPermissionSearch(event.target.value)}
                  placeholder="Search direct permissions..."
                  className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-red-100"
                />
              </div>

              {/* PERMISSION CHECKBOXES */}
              <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {visibleDirectPermissions.length ? (
                  visibleDirectPermissions.map((permission) => {
                    const checked = selectedDirect.includes(permission.name);

                    const editable =
                      canEditPermission(permission) && !cannotManageTarget;

                    const alsoInherited = inheritedNames.has(permission.name);

                    return (
                      <label
                        key={permission.name}
                        className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleDirectPermission(permission.name)
                          }
                          disabled={busy || !editable}
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

                        {!editable && (
                          <span className="text-xs text-slate-400">
                            Restricted
                          </span>
                        )}
                      </label>
                    );
                  })
                ) : (
                  <p className="p-3 text-sm text-slate-500">
                    No direct permissions to display.
                  </p>
                )}
              </div>

              {lockedDirectPermission && (
                <p className="mt-3 text-xs leading-5 text-amber-800">
                  Some existing direct permissions are outside your authority.
                  They cannot be modified.
                </p>
              )}

              {canManagePermissions && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={saveDirectPermissions}
                    disabled={
                      busy ||
                      !permissionsChanged ||
                      lockedDirectPermission ||
                      cannotManageTarget
                    }
                    className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
                  >
                    {saving === "permissions"
                      ? "Saving..."
                      : "Save direct permissions"}
                  </button>
                </div>
              )}
            </section>

            {/* ================================ */}
            {/* PROFILE EDITING ACCESS           */}
            {/* SUPER ADMIN ONLY                 */}
            {/* ================================ */}

            {isSuperAdmin &&
              latestUser &&
              !latestUser.is_super_admin &&
              Number(latestUser.id) !== Number(actor?.id) && (
                <ProfileEditAccess
                  user={latestUser}
                  onSaved={onSaved}
                  onClose={onClose}
                />
              )}
          </>
        )}

        {/* FOOTER */}
        <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
          Laravel validates all role and permission assignments. Profile editing
          access is controlled separately by Super Admin.
        </p>
      </div>
    </Modal>
  );
}
