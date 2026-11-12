import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import Modal from "../../components/ui/Modal";
import useTimedMessage from "../../hooks/useTimedMessage";

import { rolesApi, roleApiError } from "./rolesApi";

export default function DeleteRoleDialog({ role, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const errorNotice = useTimedMessage();

  async function handleDelete() {
    if (busy) return;

    setBusy(true);
    errorNotice.clear();

    try {
      await rolesApi.remove(role.id);

      onDeleted("Role deleted successfully.");
      onClose();
    } catch (err) {
      errorNotice.show(roleApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Delete role"
      description="Confirm that you want to delete this role."
      onClose={onClose}
      busy={busy}
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={22} className="shrink-0 text-red-700" />

          <p className="text-sm leading-6 text-red-900">
            You are about to delete the role
            <strong> {role.name}</strong>. This action cannot be undone.
          </p>
        </div>

        <p className="text-sm leading-6 text-slate-600">
          A role can only be deleted after it has been unassigned from all
          users.
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
            {busy ? "Deleting..." : "Delete role"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
