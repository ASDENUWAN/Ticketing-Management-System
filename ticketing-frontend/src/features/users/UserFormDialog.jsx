import { useState } from "react";
import { Save, UserRoundPlus } from "lucide-react";

import Modal from "../../components/ui/Modal";
import { usersApi, apiErrorMessage } from "./usersApi";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-red-100";

function Field({ label, name, value, onChange, error, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}

      <input
        name={name}
        value={value}
        onChange={onChange}
        className={inputClass}
        aria-invalid={Boolean(error)}
        {...props}
      />

      {error && (
        <span role="alert" className="mt-1 block text-xs text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}

export default function UserFormDialog({ user, onClose, onSaved }) {
  const editing = Boolean(user);

  const [values, setValues] = useState({
    username: user?.username ?? "",
    name: user?.name ?? "",
    email: user?.email ?? "",
    contact_no: user?.contact_no ?? "",
    password: "",
    password_confirmation: "",
  });

  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function change(event) {
    const { name, value } = event.target;

    setValues((old) => ({
      ...old,
      [name]: value,
    }));

    setErrors((old) => ({
      ...old,
      [name]: undefined,
    }));
  }

  async function submit(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");
    setErrors({});

    try {
      if (editing) {
        await usersApi.update(user.id, {
          name: values.name.trim(),
          email: values.email.trim() || null,
          contact_no: values.contact_no.trim() || null,
        });
      } else {
        await usersApi.create({
          username: values.username.trim(),
          email: values.email.trim() || null,
          contact_no: values.contact_no.trim() || null,
          password: values.password,
          password_confirmation: values.password_confirmation,
        });
      }

      onSaved(
        editing ? "User updated successfully." : "User created successfully.",
      );

      onClose();
    } catch (err) {
      setErrors(err.response?.data?.errors ?? {});
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit user" : "Create new user"}
      description={
        editing
          ? "Update this user's profile details."
          : "Create an account for an authorized CITS Desk user."
      }
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {editing ? (
          <div>
            <p className="text-sm font-medium text-slate-700">Username</p>

            <div className="mt-1.5 rounded-xl bg-slate-100 px-3.5 py-3 text-sm text-slate-600">
              @{user.username}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Usernames cannot be changed.
            </p>
          </div>
        ) : (
          <Field
            label="Username *"
            name="username"
            value={values.username}
            onChange={change}
            error={errors.username?.[0]}
            minLength={3}
            maxLength={50}
            pattern="[A-Za-z0-9._-]+"
            autoComplete="off"
            required
          />
        )}

        {editing && (
          <Field
            label="Display name *"
            name="name"
            value={values.name}
            onChange={change}
            error={errors.name?.[0]}
            maxLength={100}
            required
          />
        )}

        <Field
          label="Email address"
          name="email"
          type="email"
          value={values.email}
          onChange={change}
          error={errors.email?.[0]}
          maxLength={255}
          placeholder="user@university.lk"
        />

        <Field
          label="Contact number"
          name="contact_no"
          type="tel"
          value={values.contact_no}
          onChange={change}
          error={errors.contact_no?.[0]}
          maxLength={20}
          placeholder="+94..."
        />

        {!editing && (
          <>
            <Field
              label="Password *"
              name="password"
              type="password"
              value={values.password}
              onChange={change}
              error={errors.password?.[0]}
              autoComplete="new-password"
              minLength={4}
              maxLength={128}
              required
            />

            <Field
              label="Confirm password *"
              name="password_confirmation"
              type="password"
              value={values.password_confirmation}
              onChange={change}
              error={errors.password_confirmation?.[0]}
              autoComplete="new-password"
              required
            />

            <p className="text-xs leading-5 text-slate-500">
              Password must have at least 12 characters, uppercase and lowercase
              letters, a number, and a symbol.
            </p>

            <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
              The display name will initially match the username. Assign roles
              after creating the account.
            </div>
          </>
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
            {editing ? <Save size={17} /> : <UserRoundPlus size={17} />}

            {busy ? "Saving..." : editing ? "Save changes" : "Create user"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
