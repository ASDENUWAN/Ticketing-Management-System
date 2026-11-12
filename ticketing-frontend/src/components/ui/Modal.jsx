import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({
  title,
  description,
  onClose,
  busy = false,
  children,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onClose={() => {
        if (!dialogRef.current?.open) {
          onClose();
        }
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>

          <p
            id={descriptionId}
            className="mt-1 text-sm leading-6 text-slate-500"
          >
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close dialog"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </dialog>
  );
}
