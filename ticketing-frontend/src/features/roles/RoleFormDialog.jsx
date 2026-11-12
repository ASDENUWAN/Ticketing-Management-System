import { useState } from "react";
import { Save, ShieldPlus } from "lucide-react";

import Modal from "../../components/ui/Modal";
import useTimedMessage from "../../hooks/useTimedMessage";

import { rolesApi, roleApiError } from "./rolesApi";

export default function RoleFormDialog({ role, onClose, onSaved }) {
  const editing = Boolean(role);

  const [name, setName] = useState(role?.name ?? "");

  const [fieldError, setFieldError] = useState("");

  const [busy, setBusy] = useState(false);

  const errorNotice = useTimedMessage();

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy) return;

    errorNotice.clear();
    setFieldError("");

    const value = name.trim();

    if (value.length < 3) {
      setFieldError("Role name must contain at least 3 characters.");
      return;
    }

    if (!/^[A-Za-z][A-Za-z0-9 ._-]*$/.test(value)) {
      setFieldError(
        "Use letters, numbers, spaces, dots, hyphens or underscores.",
      );
      return;
    }

    if (value.toLowerCase() === "super admin") {
      setFieldError("This role name is reserved.");
      return;
    }

    setBusy(true);

    try {
      if (editing) {
        await rolesApi.update(role.id, value);
      } else {
        await rolesApi.create(value);
      }

      onSaved(
        editing ? "Role updated successfully." : "Role created successfully.",
      );

      onClose();
    } catch (err) {
      setFieldError(err.response?.data?.errors?.name?.[0] ?? "");

      errorNotice.show(roleApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit role" : "Create new role"}
      description={
        editing
          ? "Update the role name."
          : "Create a new role for USJ CITS Desk."
      }
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
            htmlFor="role-name"
            className="block text-sm font-semibold text-slate-700"
          >
            Role name *
          </label>

          <input
            id="role-name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setFieldError("");
            }}
            maxLength={80}
            minLength={3}
            required
            autoFocus
            placeholder="e.g. Support Agent"
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? "role-name-error" : undefined}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-red-100"
          />

          {fieldError && (
            <p id="role-name-error" className="mt-2 text-xs text-red-700">
              {fieldError}
            </p>
          )}

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Use a descriptive role name such as Support Agent or Ticket Manager.
          </p>
        </div>

        {!editing && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
            New roles have no permissions initially. Assign permissions after
            creation.
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
          >
            {editing ? <Save size={17} /> : <ShieldPlus size={17} />}

            {busy ? "Saving..." : editing ? "Save changes" : "Create role"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
