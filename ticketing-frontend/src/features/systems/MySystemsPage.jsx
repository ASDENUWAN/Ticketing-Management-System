import { useEffect, useState } from "react";

import { Layers3, Monitor, RefreshCw, ShieldCheck } from "lucide-react";

import useTimedMessage from "../../hooks/useTimedMessage";

import { systemsApi, systemApiError } from "./systemsApi";

export function AssignedSystemsPanel({ compact = false }) {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const errorNotice = useTimedMessage(30000);
  const showError = errorNotice.show;

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);

      try {
        const response = await systemsApi.mine({
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setSystems(response.data ?? []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setSystems([]);
          showError(systemApiError(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [refreshKey, showError]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">My Systems</h2>
          <p className="mt-1 text-sm text-slate-500">
            Systems assigned to your account.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((value) => value + 1)}
          aria-label="Refresh my systems"
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {errorNotice.message && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {errorNotice.message}
        </div>
      )}

      {loading ? (
        <div
          role="status"
          className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500"
        >
          Loading your systems...
        </div>
      ) : systems.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <Monitor size={30} className="mx-auto text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-800">
            No systems assigned
          </p>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            Contact your CITS administrator to request access to a system.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {systems.map((system) => (
            <article
              key={system.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-xl bg-red-50 p-3 text-brand">
                  <Monitor size={23} />
                </div>

                {system.is_head && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                    <ShieldCheck size={13} />
                    System Head
                  </span>
                )}
              </div>

              <h3 className="mt-4 font-bold text-slate-900">{system.name}</h3>

              <p className="mt-1 font-mono text-xs text-slate-500">
                {system.code}
              </p>

              {!compact && system.description && (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {system.description}
                </p>
              )}

              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <Layers3 size={16} />
                {system.categories.length} available modules
              </div>

              {!compact && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {system.categories.map((category) => (
                    <span
                      key={category.id}
                      className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700"
                    >
                      {category.name}
                    </span>
                  ))}
                </div>
              )}

              {system.can_request_change && (
                <p className="mt-4 text-xs font-semibold text-brand">
                  Change Request eligible
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function MySystemsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Systems</h1>

        <p className="mt-1 text-sm text-slate-500">
          View systems and modules available to your account.
        </p>
      </div>

      <AssignedSystemsPanel />
    </div>
  );
}
