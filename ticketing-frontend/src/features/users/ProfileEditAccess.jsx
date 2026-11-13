import { useState } from "react";

import { CheckCircle2, LockKeyhole, UnlockKeyhole } from "lucide-react";

import useTimedMessage from "../../hooks/useTimedMessage";

import { usersApi, apiErrorMessage } from "./usersApi";

export default function ProfileEditAccess({ user, onSaved, onClose }) {
  const [enabled, setEnabled] = useState(user?.profile_edit_enabled === true);

  const [busy, setBusy] = useState(false);

  const errorNotice = useTimedMessage(30000);

  const hasProfilePermission =
    user?.is_super_admin === true ||
    (user?.effective_permissions ?? []).includes("profile.update");

  async function handleToggle() {
    if (busy) return;

    setBusy(true);
    errorNotice.clear();

    const newValue = !enabled;

    try {
      await usersApi.updateProfileEditing(user.id, newValue);

      setEnabled(newValue);

      onSaved(
        newValue
          ? "Profile editing enabled successfully."
          : "Profile editing disabled successfully.",
      );

      // Close the Manage Access dialog after saving.
      onClose();
    } catch (error) {
      errorNotice.show(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-t border-slate-100 pt-5">
      <div className="mb-3 flex items-center gap-2">
        <LockKeyhole size={20} className="text-brand" />

        <h3 className="font-semibold text-slate-900">Profile Editing Access</h3>
      </div>

      <p className="mb-4 text-xs leading-6 text-slate-500">
        Super Admin can immediately allow or disable this user's ability to edit
        their own name, email, and contact number.
      </p>

      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={
                enabled
                  ? "rounded-xl bg-emerald-50 p-2.5 text-emerald-700"
                  : "rounded-xl bg-red-50 p-2.5 text-red-700"
              }
            >
              {enabled ? (
                <UnlockKeyhole size={20} />
              ) : (
                <LockKeyhole size={20} />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {enabled
                  ? "Profile editing enabled"
                  : "Profile editing disabled"}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {enabled
                  ? "Account-level editing is currently allowed."
                  : "This user can view their profile but cannot edit it."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggle}
            disabled={busy}
            className={
              enabled
                ? "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                : "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
            }
          >
            {enabled ? <LockKeyhole size={17} /> : <UnlockKeyhole size={17} />}

            {busy
              ? "Saving..."
              : enabled
                ? "Disable editing"
                : "Enable editing"}
          </button>
        </div>
      </div>

      {enabled && hasProfilePermission && (
        <p className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 size={16} />
          Both editing requirements are satisfied.
        </p>
      )}

      {enabled && !hasProfilePermission && (
        <p className="mt-3 text-xs leading-6 text-amber-800">
          The account-level switch is enabled, but this user does not currently
          have the profile.update permission. Assign that permission to permit
          editing.
        </p>
      )}

      {errorNotice.message && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {errorNotice.message}
        </div>
      )}

      <p className="mt-4 text-xs leading-6 text-slate-500">
        This control affects self-service profile editing only. It does not
        disable the user's account or login access.
      </p>
    </section>
  );
}
