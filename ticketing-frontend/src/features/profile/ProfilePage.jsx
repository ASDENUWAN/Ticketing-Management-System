import { useEffect, useState } from "react";

import {
  AtSign,
  CheckCircle2,
  Edit3,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import useTimedMessage from "../../hooks/useTimedMessage";

import { profileApi, profileApiError } from "./profileApi";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-red-100 disabled:bg-slate-50 disabled:text-slate-500";

function getFormValues(user) {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    contact_no: user?.contact_no ?? "",
  };
}

function ProfileField({
  label,
  icon: Icon,
  name,
  value,
  editing,
  onChange,
  error,
  ...props
}) {
  return (
    <div>
      <label
        htmlFor={`profile-${name}`}
        className="flex items-center gap-2 text-sm font-semibold text-slate-700"
      >
        <Icon size={17} className="text-slate-400" aria-hidden="true" />
        {label}
      </label>

      <input
        id={`profile-${name}`}
        name={name}
        value={value}
        onChange={onChange}
        disabled={!editing}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `profile-${name}-error` : undefined}
        className={inputClass}
        {...props}
      />

      {error && (
        <p
          id={`profile-${name}-error`}
          role="alert"
          className="mt-1.5 text-xs text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [values, setValues] = useState(() => getFormValues(user));

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const notice = useTimedMessage(30000);
  const errorNotice = useTimedMessage(30000);

  // Laravel is authoritative for this value.
  const canEditProfile = user?.can_edit_profile === true;

  /**
   * Keep read-only details synchronized with
   * the latest authenticated user information.
   *
   * Do not overwrite unsaved form changes
   * during normal authentication refreshes.
   */
  useEffect(() => {
    if (!editing) {
      setValues(getFormValues(user));
    }
  }, [user?.name, user?.email, user?.contact_no, editing]);

  /**
   * If Super Admin disables editing while this
   * page is open, leave edit mode.
   */
  useEffect(() => {
    if (!canEditProfile && editing) {
      setEditing(false);
      setErrors({});
      setValues(getFormValues(user));

      errorNotice.show("Profile editing has been disabled for your account.");
    }
  }, [canEditProfile, editing]);

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: undefined,
    }));
  }

  function startEditing() {
    if (!canEditProfile || saving) return;

    setValues(getFormValues(user));
    setErrors({});
    errorNotice.clear();

    setEditing(true);
  }

  function cancelEditing() {
    if (saving) return;

    setEditing(false);
    setErrors({});
    setValues(getFormValues(user));
  }

  async function handleSave(event) {
    event.preventDefault();

    if (saving || !editing || !canEditProfile) {
      return;
    }

    setSaving(true);
    setErrors({});
    errorNotice.clear();

    try {
      await profileApi.update({
        name: values.name.trim(),
        email: values.email.trim() || null,
        contact_no: values.contact_no.trim() || null,
      });

      // Update the sidebar, header, and profile
      // with the latest name and permissions.
      await refreshUser();

      setEditing(false);

      notice.show("Your profile has been updated successfully.");
    } catch (error) {
      setErrors(error.response?.data?.errors ?? {});

      errorNotice.show(profileApiError(error));

      // Update access information if the server
      // rejected the request due to authorization.
      if (error.response?.status === 403 || error.response?.status === 401) {
        await refreshUser();
      }
    } finally {
      setSaving(false);
    }
  }

  const roles = user?.roles ?? [];
  const directPermissions = user?.direct_permissions ?? [];
  const inheritedPermissions = user?.inherited_permissions ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Profile
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your personal account information.
          </p>
        </div>

        {canEditProfile && !editing && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Edit3 size={18} />
            Edit profile
          </button>
        )}
      </div>

      {/* NOTIFICATIONS */}
      {notice.message && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            {notice.message}
          </span>

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

      {/* EDITING RESTRICTION */}
      {!canEditProfile && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <LockKeyhole size={20} className="mt-0.5 shrink-0 text-amber-800" />

          <div>
            <h2 className="text-sm font-semibold text-amber-900">
              Profile editing is unavailable
            </h2>

            <p className="mt-1 text-xs leading-6 text-amber-900">
              You can view your profile, but you cannot modify your personal
              details with your current account permissions. Contact your system
              administrator if editing is required.
            </p>
          </div>
        </div>
      )}

      {/* ACCOUNT DETAILS CARD */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 p-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-brand">
            <UserRound size={30} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-slate-900">
              {user?.name || user?.username}
            </h2>

            <p className="mt-1 text-sm text-slate-500">@{user?.username}</p>
          </div>

          <span
            className={
              canEditProfile
                ? "rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800"
                : "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
            }
          >
            {canEditProfile ? "Editing allowed" : "View only"}
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-6 p-5 sm:p-6">
          {/* PERMANENT USERNAME */}
          <div>
            <label
              htmlFor="profile-username"
              className="flex items-center gap-2 text-sm font-semibold text-slate-700"
            >
              <AtSign size={17} className="text-slate-400" />
              Username
            </label>

            <div className="relative mt-2">
              <input
                id="profile-username"
                type="text"
                value={user?.username ?? ""}
                readOnly
                aria-readonly="true"
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 pr-12 text-sm text-slate-600 outline-none"
              />

              <LockKeyhole
                size={17}
                aria-hidden="true"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Your login username is permanent and cannot be changed.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* DISPLAY NAME */}
            <div className="sm:col-span-2">
              <ProfileField
                label="Full name"
                icon={UserRound}
                name="name"
                value={values.name}
                onChange={handleChange}
                editing={editing && !saving}
                error={errors.name?.[0]}
                maxLength={100}
                required
              />
            </div>

            {/* EMAIL */}
            <ProfileField
              label="Email address"
              icon={Mail}
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              editing={editing && !saving}
              error={errors.email?.[0]}
              maxLength={255}
              placeholder="name@sjp.ac.lk"
            />

            {/* CONTACT */}
            <ProfileField
              label="Contact number"
              icon={Phone}
              name="contact_no"
              type="tel"
              value={values.contact_no}
              onChange={handleChange}
              editing={editing && !saving}
              error={errors.contact_no?.[0]}
              maxLength={20}
              placeholder="+94..."
            />
          </div>

          {editing && canEditProfile && (
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <X size={17} />
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
              >
                <Save size={17} />
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          )}
        </form>
      </section>

      {/* ASSIGNED ROLES */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck size={20} className="text-brand" />

          <h2 className="font-semibold text-slate-900">My Roles</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {roles.length ? (
            roles.map((role) => (
              <span
                key={role}
                className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-brand"
              >
                {role}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500">No roles assigned.</p>
          )}
        </div>
      </section>

      {/* DIRECT AND INHERITED PERMISSIONS */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <KeyRound size={20} className="text-brand" />

          <h2 className="font-semibold text-slate-900">My Permissions</h2>
        </div>

        {user?.is_super_admin ? (
          <p className="text-sm text-slate-600">
            Your Super Admin role provides full system authorization.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Direct Permissions
              </h3>

              <div className="flex flex-wrap gap-2">
                {directPermissions.length ? (
                  directPermissions.map((permission) => (
                    <span
                      key={permission}
                      className="break-all rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700"
                    >
                      {permission}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">
                    No direct permissions.
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Permissions From Roles
              </h3>

              <div className="flex flex-wrap gap-2">
                {inheritedPermissions.length ? (
                  inheritedPermissions.map((permission) => (
                    <span
                      key={permission}
                      className="break-all rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-brand"
                    >
                      {permission}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">
                    No inherited permissions.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <p className="text-center text-xs text-slate-400">
        USJ CITS Desk — University of Sri Jayewardenepura
      </p>
    </div>
  );
}
