import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import Modal from "../../components/ui/Modal";
import { usersApi, apiErrorMessage } from "./usersApi";

export default function DeleteUserDialog({ user, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await usersApi.remove(user.id);
      onDeleted();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Delete user"
      description="Confirm that this is the correct account."
      busy={busy}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={22} className="shrink-0 text-red-700" />

          <p className="text-sm leading-6 text-red-900">
            You are about to permanently delete
            <strong> {user.name}</strong> (@{user.username}). This action cannot
            be undone.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
          >
            <Trash2 size={17} />
            {busy ? "Deleting..." : "Delete user"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
