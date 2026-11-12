import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";

import Modal from "../../components/ui/Modal";
import { can } from "../../utils/permissions";
import { usersApi, apiErrorMessage } from "./usersApi";

export default function UserAccessDialog({ user, actor, onClose, onSaved }) {
  const canManageRoles =
    can(actor, "users.update") &&
    can(actor, "roles.assign") &&
    can(actor, "roles.view");

  const canManagePermissions =
    can(actor, "users.update") &&
    can(actor, "permissions.assign") &&
    can(actor, "permissions.view");

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);

  const [selectedRoles, setSelectedRoles] = useState(
    user.roles?.map((role) => role.id) ?? [],
  );

  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const [allRoles, allPermissions] = await Promise.all([
          canManageRoles
            ? usersApi.allOptions("/api/roles")
            : Promise.resolve([]),

          canManagePermissions
            ? usersApi.allOptions("/api/permissions")
            : Promise.resolve([]),
        ]);

        if (!active) return;

        // Filter protected role and permissions
        // the administrator cannot delegate.
        const availableRoles = allRoles.filter((role) => {
          if (role.name.toLowerCase() === "super admin") {
            return false;
          }

          if (actor.is_super_admin) return true;

          return role.permissions.every((permission) =>
            actor.permissions?.includes(permission.name),
          );
        });

        const availablePermissions = allPermissions.filter(
          (permission) =>
            actor.is_super_admin ||
            actor.permissions?.includes(permission.name),
        );

        setRoles(availableRoles);
        setPermissions(availablePermissions);

        const directNames = user.direct_permissions ?? [];

        setSelectedPermissions(
          availablePermissions
            .filter((permission) => directNames.includes(permission.name))
            .map((permission) => permission.id),
        );
      } catch (err) {
        if (active) {
          setError(apiErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, [actor, user, canManageRoles, canManagePermissions]);

  function toggleRole(id) {
    setSelectedRoles((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function togglePermission(id) {
    setSelectedPermissions((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function saveRoles() {
    setSaving("roles");
    setError("");
    setNotice("");

    try {
      await usersApi.syncRoles(user.id, selectedRoles);

      setNotice("Roles updated successfully.");
      onSaved("User roles updated successfully.");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  async function savePermissions() {
    setSaving("permissions");
    setError("");
    setNotice("");

    try {
      await usersApi.syncPermissions(user.id, selectedPermissions);

      setNotice("Direct permissions updated successfully.");

      onSaved("User permissions updated successfully.");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  const busy = saving !== null;

  return (
    <Modal
      title="Manage user access"
      description={`Configure access for @${user.username}.`}
      onClose={onClose}
      busy={busy}
    >
      <div className="space-y-6">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            <CheckCircle2 size={18} />
            {notice}
          </div>
        )}

        {loading ? (
          <p role="status" className="py-8 text-center text-sm text-slate-500">
            Loading access options...
          </p>
        ) : (
          <>
            {/* ROLE ASSIGNMENT */}
            {canManageRoles && (
              <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <ShieldCheck size={20} className="text-brand" />
                    Assigned roles
                  </h3>

                  <span className="text-xs text-slate-500">
                    {selectedRoles.length} selected
                  </span>
                </div>

                <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                  {roles.length ? (
                    roles.map((role) => (
                      <label
                        key={role.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                          disabled={busy}
                          className="h-4 w-4 accent-[#8A0007]"
                        />

                        <span className="min-w-0 text-sm text-slate-700">
                          {role.name}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="p-3 text-sm text-slate-500">
                      No assignable roles available.
                    </p>
                  )}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={saveRoles}
                    disabled={busy || roles.length === 0}
                    className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
                  >
                    {saving === "roles" ? "Saving..." : "Save roles"}
                  </button>
                </div>
              </section>
            )}

            {/* DIRECT PERMISSIONS */}
            {canManagePermissions && (
              <section className="border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <KeyRound size={20} className="text-brand" />
                    Direct permissions
                  </h3>

                  <span className="text-xs text-slate-500">
                    {selectedPermissions.length} selected
                  </span>
                </div>

                <p className="mb-3 text-xs leading-5 text-slate-500">
                  These are additional permissions. Permissions inherited from
                  roles are managed separately.
                </p>

                <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                  {permissions.length ? (
                    permissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.id)}
                          onChange={() => togglePermission(permission.id)}
                          disabled={busy}
                          className="h-4 w-4 accent-[#8A0007]"
                        />

                        <span className="break-all text-sm text-slate-700">
                          {permission.name}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="p-3 text-sm text-slate-500">
                      No assignable permissions available.
                    </p>
                  )}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={savePermissions}
                    disabled={
                      busy || permissions.length === 0 || Boolean(error)
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

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs leading-5 text-slate-500">
            Access changes are validated by Laravel. You cannot assign the Super
            Admin role or delegate permissions beyond your authority.
          </p>
        </div>
      </div>
    </Modal>
  );
}
