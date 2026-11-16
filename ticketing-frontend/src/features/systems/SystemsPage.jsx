import { useEffect, useMemo, useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";

import Modal from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { can } from "../../utils/permissions";
import useTimedMessage from "../../hooks/useTimedMessage";

import { systemsApi, systemApiError } from "./systemsApi";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-500";

const smallButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50";

function makeCode(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[^a-z]+/, "");
}

function ErrorMessage({ message }) {
  return message ? (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      {message}
    </div>
  ) : null;
}

/*
|--------------------------------------------------------------------------
| System and Module Form
|--------------------------------------------------------------------------
*/

function RecordForm({ kind, item, systemId, onSaved, onClose }) {
  const isSystem = kind === "system";
  const editing = Boolean(item);

  const [name, setName] = useState(item?.name ?? "");
  const [code, setCode] = useState(item?.code ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [active, setActive] = useState(item?.is_active ?? true);
  const [order, setOrder] = useState(String(item?.sort_order ?? 0));

  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const notice = useTimedMessage(30000);

  function changeName(value) {
    if (!editing) {
      const previousCode = makeCode(name);

      if (!code || code === previousCode) {
        setCode(makeCode(value));
      }
    }

    setName(value);
    setErrors({});
  }

  async function submit(event) {
    event.preventDefault();

    if (busy) return;

    setErrors({});
    notice.clear();

    if (name.trim().length < 2) {
      setErrors({
        name: ["Enter at least two characters."],
      });
      return;
    }

    if (!editing && !/^[a-z][a-z0-9_]*$/.test(code)) {
      setErrors({
        code: ["Enter a valid permanent code."],
      });
      return;
    }

    const sortOrder = Number(order);

    if (
      !isSystem &&
      (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 65535)
    ) {
      setErrors({
        sort_order: ["Invalid sort order."],
      });
      return;
    }

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      is_active: active,
      ...(!editing ? { code } : {}),
      ...(!isSystem ? { sort_order: sortOrder } : {}),
    };

    setBusy(true);

    try {
      let result;

      if (isSystem) {
        result = editing
          ? await systemsApi.update(item.id, data)
          : await systemsApi.create(data);
      } else {
        result = editing
          ? await systemsApi.updateCategory(systemId, item.id, data)
          : await systemsApi.createCategory(systemId, data);
      }

      onSaved(
        result.data,
        `${isSystem ? "System" : "System category"} ${
          editing ? "updated" : "created"
        } successfully.`,
      );

      onClose();
    } catch (error) {
      setErrors(error.response?.data?.errors ?? {});
      notice.show(systemApiError(error));
    } finally {
      setBusy(false);
    }
  }

  const label = isSystem ? "system" : "system category";

  return (
    <Modal
      title={`${editing ? "Edit" : "Create"} ${label}`}
      description="Configure the record's details."
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit} className="space-y-5">
        <ErrorMessage message={notice.message} />

        <div>
          <label
            htmlFor="record-name"
            className="text-sm font-semibold text-slate-700"
          >
            Name *
          </label>

          <input
            id="record-name"
            value={name}
            onChange={(e) => changeName(e.target.value)}
            maxLength={isSystem ? 150 : 120}
            required
            className={inputClass}
            placeholder={
              isSystem
                ? "Student Information Management System"
                : "Student Registration"
            }
          />

          {errors.name?.[0] && (
            <p className="mt-2 text-xs text-red-700">{errors.name[0]}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="record-code"
            className="text-sm font-semibold text-slate-700"
          >
            Permanent code *
          </label>

          <input
            id="record-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
            disabled={editing}
            maxLength={64}
            required
            className={`${inputClass} font-mono`}
            placeholder={isSystem ? "sims" : "registration"}
          />

          {errors.code?.[0] && (
            <p className="mt-2 text-xs text-red-700">{errors.code[0]}</p>
          )}

          <p className="mt-2 text-xs text-slate-500">
            The code cannot be changed after creation.
          </p>
        </div>

        <div>
          <label
            htmlFor="record-description"
            className="text-sm font-semibold text-slate-700"
          >
            Description
          </label>

          <textarea
            id="record-description"
            rows={3}
            maxLength={isSystem ? 2000 : 500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />

          {errors.description?.[0] && (
            <p className="mt-2 text-xs text-red-700">{errors.description[0]}</p>
          )}
        </div>

        {!isSystem && (
          <div>
            <label
              htmlFor="record-order"
              className="text-sm font-semibold text-slate-700"
            >
              Sort order
            </label>

            <input
              id="record-order"
              type="number"
              min="0"
              max="65535"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 accent-[#8A0007]"
          />
          Active
        </label>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={smallButton}
          >
            Cancel
          </button>

          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/*
|--------------------------------------------------------------------------
| Add/Edit System Member
|--------------------------------------------------------------------------
*/

function MemberForm({ system, member, actor, onSaved, onClose }) {
  const editing = Boolean(member);
  const canAssignHead = can(actor, "systems.heads.assign");

  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState(member ?? null);

  const [head, setHead] = useState(Boolean(member?.is_head));

  const [busy, setBusy] = useState(false);
  const errorNotice = useTimedMessage(30000);
  const showError = errorNotice.show;

  useEffect(() => {
    if (editing || search.trim().length < 2) {
      setCandidates([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setSearching(true);

      try {
        const result = await systemsApi.candidates(search.trim(), {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setCandidates(result.data ?? []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          showError(systemApiError(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, editing, showError]);

  async function save(event) {
    event.preventDefault();

    if (!selected || busy) return;

    errorNotice.clear();
    setBusy(true);

    try {
      await systemsApi.saveMember(system.id, selected.id, head);

      onSaved("System user assignment saved.");
      onClose();
    } catch (error) {
      showError(systemApiError(error));
    } finally {
      setBusy(false);
    }
  }

  const lockedHead = Boolean(member?.is_head && !canAssignHead);

  const hasHeadRole = selected?.has_system_head_role === true;

  return (
    <Modal
      title={editing ? "Edit system member" : "Assign user to system"}
      description={`System: ${system.name}`}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={save} className="space-y-5">
        <ErrorMessage message={errorNotice.message} />

        {!editing && (
          <div>
            <label
              htmlFor="member-search"
              className="text-sm font-semibold text-slate-700"
            >
              Search user
            </label>

            <input
              id="member-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(null);
                setHead(false);
              }}
              placeholder="Enter username or full name"
              className={inputClass}
            />

            <p className="mt-2 text-xs text-slate-500">
              Enter at least two characters.
            </p>

            {searching && (
              <p className="mt-2 text-xs text-slate-500">Searching...</p>
            )}

            {candidates.length > 0 && (
              <div className="mt-3 max-h-52 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {candidates.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelected(user);
                      setHead(false);
                      setCandidates([]);
                    }}
                    className="w-full rounded-lg p-3 text-left hover:bg-red-50"
                  >
                    <span className="block text-sm font-semibold">
                      {user.name || user.username}
                    </span>

                    <span className="block text-xs text-slate-500">
                      @{user.username}
                      {user.has_system_head_role && " · System Head role"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selected && (
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">
              {selected.name || selected.username}
            </p>

            <p className="mt-1 text-xs text-slate-500">@{selected.username}</p>

            <p className="mt-2 text-xs text-slate-500">
              Roles: {selected.roles?.join(", ") || "None"}
            </p>
          </div>
        )}

        {selected && (
          <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={head}
              onChange={(e) => setHead(e.target.checked)}
              disabled={busy || lockedHead || !canAssignHead || !hasHeadRole}
              className="mt-1 h-4 w-4 accent-[#8A0007]"
            />

            <span>
              <span className="block text-sm font-semibold text-slate-800">
                Designate as System Head
              </span>

              <span className="mt-1 block text-xs leading-6 text-slate-500">
                Requires the System Head role and systems.heads.assign
                authorization.
              </span>
            </span>
          </label>
        )}

        {selected && !hasHeadRole && (
          <p className="text-xs text-amber-800">
            To designate this user as a head, assign the System Head role
            through User Management first.
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={smallButton}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={busy || !selected || lockedHead}
            className={primaryButton}
          >
            {busy ? "Saving..." : "Save assignment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/*
|--------------------------------------------------------------------------
| Delete Confirmation
|--------------------------------------------------------------------------
*/

function DeleteDialog({ kind, item, system, onSaved, onClose }) {
  const [busy, setBusy] = useState(false);
  const notice = useTimedMessage(30000);

  async function remove() {
    if (busy) return;

    setBusy(true);
    notice.clear();

    try {
      if (kind === "system") {
        await systemsApi.remove(item.id);
      } else if (kind === "category") {
        await systemsApi.deleteCategory(system.id, item.id);
      } else {
        await systemsApi.removeMember(system.id, item.id);
      }

      onSaved("Record removed successfully.");
      onClose();
    } catch (error) {
      notice.show(systemApiError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Confirm removal"
      description="Review this action before continuing."
      onClose={onClose}
      busy={busy}
    >
      <div className="space-y-5">
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
          Remove <strong>{item.name || item.username}</strong>? This action
          cannot be undone.
        </p>

        {kind === "system" && (
          <p className="text-xs leading-6 text-slate-600">
            A system must have no categories, assigned users, or other
            references before it can be deleted.
          </p>
        )}

        <ErrorMessage message={notice.message} />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={smallButton}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
          >
            {busy ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/*
|--------------------------------------------------------------------------
| Main System Management Page
|--------------------------------------------------------------------------
*/

export default function SystemsPage() {
  const { user: actor } = useAuth();

  const [systems, setSystems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [systemVersion, setSystemVersion] = useState(0);

  const [systemMeta, setSystemMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  const [loadingSystems, setLoadingSystems] = useState(true);

  const [tab, setTab] = useState("categories");

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryVersion, setCategoryVersion] = useState(0);

  const [members, setMembers] = useState([]);
  const [memberPage, setMemberPage] = useState(1);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberTerm, setMemberTerm] = useState("");
  const [memberVersion, setMemberVersion] = useState(0);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [memberMeta, setMemberMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  const [dialog, setDialog] = useState(null);

  const notice = useTimedMessage(30000);
  const errorNotice = useTimedMessage(30000);
  const showError = errorNotice.show;

  const selectedSystem = useMemo(
    () => systems.find((system) => system.id === selectedId) ?? null,
    [systems, selectedId],
  );

  const canViewMembers = can(actor, "systems.members.view");

  // Debounce system search.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setTerm(search.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  // Load all systems for the current page.
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoadingSystems(true);

      try {
        const result = await systemsApi.list({
          page,
          search: term,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const items = result.data ?? [];
        const nextMeta = result.meta ?? {};

        if (page > 1 && page > Number(nextMeta.last_page ?? 1)) {
          setPage(Number(nextMeta.last_page));
          return;
        }

        setSystems(items);
        setSystemMeta(nextMeta);

        setSelectedId((oldId) =>
          items.some((item) => item.id === oldId)
            ? oldId
            : (items[0]?.id ?? null),
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          setSystems([]);
          showError(systemApiError(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSystems(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [page, term, systemVersion, showError]);

  // Load categories for selected system.
  useEffect(() => {
    if (selectedId === null) {
      setCategories([]);
      return;
    }

    const controller = new AbortController();

    async function load() {
      setLoadingCategories(true);

      try {
        const result = await systemsApi.categories(selectedId, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setCategories(result.data ?? []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setCategories([]);
          showError(systemApiError(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCategories(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [selectedId, categoryVersion, showError]);

  // Debounce member search.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMemberPage(1);
      setMemberTerm(memberSearch.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [memberSearch]);

  // Load members only when the Members tab is open.
  useEffect(() => {
    if (selectedId === null || tab !== "members" || !canViewMembers) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      setLoadingMembers(true);

      try {
        const result = await systemsApi.members(selectedId, {
          page: memberPage,
          search: memberTerm,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const nextMeta = result.meta ?? {};

        if (memberPage > 1 && memberPage > Number(nextMeta.last_page ?? 1)) {
          setMemberPage(Number(nextMeta.last_page));
          return;
        }

        setMembers(result.data ?? []);
        setMemberMeta(nextMeta);
      } catch (error) {
        if (!controller.signal.aborted) {
          setMembers([]);
          showError(systemApiError(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingMembers(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [
    selectedId,
    tab,
    canViewMembers,
    memberPage,
    memberTerm,
    memberVersion,
    showError,
  ]);

  function selectSystem(id) {
    setSelectedId(id);
    setTab("categories");
    setMemberSearch("");
    setMemberTerm("");
    setMemberPage(1);
  }

  function refreshSystems() {
    setSystemVersion((v) => v + 1);
  }

  function recordSaved(item, message) {
    notice.show(message);

    // Locate the saved system after create/edit.
    setSearch(item.name);
    setTerm(item.name);
    setPage(1);
    setSelectedId(item.id);

    refreshSystems();
  }

  function systemDeleted(message) {
    notice.show(message);
    setSelectedId(null);
    setSearch("");
    setTerm("");
    setPage(1);
    refreshSystems();
  }

  function categorySaved(_item, message) {
    notice.show(message);
    setCategoryVersion((v) => v + 1);
    refreshSystems();
  }

  function memberSaved(message) {
    notice.show(message);
    setMemberVersion((v) => v + 1);
    refreshSystems();
  }

  function openDialog(kind, item = null) {
    setDialog({ kind, item });
  }

  const canCreateSystem = can(actor, "systems.create");
  const canUpdateSystem = can(actor, "systems.update");
  const canDeleteSystem = can(actor, "systems.delete");

  const canCreateCategory = can(actor, "system_categories.create");
  const canUpdateCategory = can(actor, "system_categories.update");
  const canDeleteCategory = can(actor, "system_categories.delete");

  const canAssignMembers = can(actor, "systems.members.assign");
  const canAssignHeads = can(actor, "systems.heads.assign");

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            System Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage supported systems, modules, and user assignments.
          </p>
        </div>

        {canCreateSystem && (
          <button
            type="button"
            onClick={() => openDialog("system-form")}
            className={primaryButton}
          >
            <Plus size={17} />
            New system
          </button>
        )}
      </div>

      {notice.message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {notice.message}
        </div>
      )}

      <ErrorMessage message={errorNotice.message} />

      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* SYSTEM LIST */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <Monitor size={19} className="text-brand" />
              <h2 className="font-semibold">Systems</h2>
            </div>

            <div className="relative mt-4">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                aria-label="Search systems"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search systems..."
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="max-h-[560px] space-y-1 overflow-y-auto p-3">
            {loadingSystems ? (
              <p className="p-4 text-sm text-slate-500">Loading systems...</p>
            ) : systems.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No systems found.</p>
            ) : (
              systems.map((system) => (
                <button
                  key={system.id}
                  type="button"
                  onClick={() => selectSystem(system.id)}
                  className={[
                    "flex w-full items-center gap-3 rounded-xl p-3 text-left",
                    selectedId === system.id
                      ? "bg-red-50 text-brand"
                      : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <Monitor size={19} />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {system.name}
                    </span>

                    <span className="block font-mono text-xs text-slate-500">
                      {system.code}
                    </span>
                  </span>

                  {!system.is_active && (
                    <span className="text-xs text-slate-400">Inactive</span>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 p-3">
            <button
              type="button"
              aria-label="Previous systems"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className={smallButton}
            >
              <ChevronLeft size={17} />
            </button>

            <span className="text-xs text-slate-500">
              Page {systemMeta.current_page} of {systemMeta.last_page}
            </span>

            <button
              type="button"
              aria-label="Next systems"
              disabled={page >= systemMeta.last_page}
              onClick={() => setPage((p) => p + 1)}
              className={smallButton}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </section>

        {/* SELECTED SYSTEM */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {!selectedSystem ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Select a system to manage its details.
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-slate-900">
                      {selectedSystem.name}
                    </h2>

                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {selectedSystem.code}
                    </p>

                    {selectedSystem.description && (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {selectedSystem.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs">
                        {selectedSystem.categories_count} modules
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs">
                        {selectedSystem.users_count} users
                      </span>

                      <span
                        className={
                          selectedSystem.is_active
                            ? "rounded-full bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800"
                            : "rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600"
                        }
                      >
                        {selectedSystem.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canUpdateSystem && (
                      <button
                        type="button"
                        onClick={() =>
                          openDialog("system-form", selectedSystem)
                        }
                        className={smallButton}
                      >
                        <Pencil size={16} />
                        Edit
                      </button>
                    )}

                    {canDeleteSystem && (
                      <button
                        type="button"
                        onClick={() =>
                          openDialog("system-delete", selectedSystem)
                        }
                        className={smallButton}
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* TABS */}
              <div className="flex border-b border-slate-100 px-4">
                <button
                  type="button"
                  onClick={() => setTab("categories")}
                  className={[
                    "flex items-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold",
                    tab === "categories"
                      ? "border-brand text-brand"
                      : "border-transparent text-slate-500",
                  ].join(" ")}
                >
                  <FolderTree size={17} />
                  Modules
                </button>

                {canViewMembers && (
                  <button
                    type="button"
                    onClick={() => setTab("members")}
                    className={[
                      "flex items-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold",
                      tab === "members"
                        ? "border-brand text-brand"
                        : "border-transparent text-slate-500",
                    ].join(" ")}
                  >
                    <UsersRound size={17} />
                    Members
                  </button>
                )}
              </div>

              {/* MODULES TAB */}
              {tab === "categories" && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <h3 className="font-semibold">System Categories</h3>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCategoryVersion((v) => v + 1)}
                        className={smallButton}
                        aria-label="Refresh modules"
                      >
                        <RefreshCw size={16} />
                      </button>

                      {canCreateCategory && (
                        <button
                          type="button"
                          onClick={() => openDialog("category-form")}
                          className={primaryButton}
                        >
                          <Plus size={16} />
                          Add module
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {loadingCategories ? (
                      <p className="p-6 text-sm text-slate-500">
                        Loading modules...
                      </p>
                    ) : categories.length === 0 ? (
                      <p className="p-6 text-sm text-slate-500">
                        No modules created for this system.
                      </p>
                    ) : (
                      categories.map((category) => (
                        <div
                          key={category.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-5"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800">
                              {category.name}
                            </p>

                            <p className="mt-1 font-mono text-xs text-slate-500">
                              {category.code}
                            </p>

                            {category.description && (
                              <p className="mt-2 text-xs text-slate-500">
                                {category.description}
                              </p>
                            )}

                            <p className="mt-2 text-xs text-slate-400">
                              {category.is_active ? "Active" : "Inactive"}
                              {" · Order: "}
                              {category.sort_order}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            {canUpdateCategory && (
                              <button
                                type="button"
                                onClick={() =>
                                  openDialog("category-form", category)
                                }
                                className={smallButton}
                              >
                                <Pencil size={15} />
                                Edit
                              </button>
                            )}

                            {canDeleteCategory && (
                              <button
                                type="button"
                                onClick={() =>
                                  openDialog("category-delete", category)
                                }
                                className={smallButton}
                              >
                                <Trash2 size={15} />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* MEMBERS TAB */}
              {tab === "members" && canViewMembers && (
                <div>
                  <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-semibold">Assigned Users</h3>

                    {canAssignMembers && (
                      <button
                        type="button"
                        onClick={() => openDialog("member-form")}
                        className={primaryButton}
                      >
                        <Plus size={16} />
                        Assign user
                      </button>
                    )}
                  </div>

                  <div className="px-5 pb-4">
                    <div className="relative">
                      <Search
                        size={17}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="search"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Search assigned users..."
                        className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand"
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {loadingMembers ? (
                      <p className="p-6 text-sm text-slate-500">
                        Loading members...
                      </p>
                    ) : members.length === 0 ? (
                      <p className="p-6 text-sm text-slate-500">
                        No matching assigned users.
                      </p>
                    ) : (
                      members.map((member) => (
                        <div
                          key={member.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-5"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {member.name || member.username}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              @{member.username}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              {member.is_head && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-900">
                                  <ShieldCheck size={13} />
                                  System Head
                                </span>
                              )}

                              {member.has_system_head_role &&
                                !member.is_head && (
                                  <span className="text-xs text-slate-500">
                                    Has System Head role
                                  </span>
                                )}
                            </div>
                          </div>

                          {canAssignMembers &&
                            (!member.is_head || canAssignHeads) && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openDialog("member-form", member)
                                  }
                                  className={smallButton}
                                >
                                  <Pencil size={15} />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openDialog("member-delete", member)
                                  }
                                  className={smallButton}
                                >
                                  <Trash2 size={15} />
                                  Remove
                                </button>
                              </div>
                            )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 p-4">
                    <button
                      type="button"
                      disabled={memberPage <= 1}
                      onClick={() => setMemberPage((p) => p - 1)}
                      className={smallButton}
                    >
                      <ChevronLeft size={17} />
                    </button>

                    <span className="text-xs text-slate-500">
                      Page {memberMeta.current_page} of {memberMeta.last_page}
                    </span>

                    <button
                      type="button"
                      disabled={memberPage >= memberMeta.last_page}
                      onClick={() => setMemberPage((p) => p + 1)}
                      className={smallButton}
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* CREATE / EDIT SYSTEM */}
      {dialog?.kind === "system-form" && (
        <RecordForm
          kind="system"
          item={dialog.item}
          onSaved={recordSaved}
          onClose={() => setDialog(null)}
        />
      )}

      {/* CREATE / EDIT CATEGORY */}
      {dialog?.kind === "category-form" && selectedSystem && (
        <RecordForm
          kind="category"
          item={dialog.item}
          systemId={selectedSystem.id}
          onSaved={categorySaved}
          onClose={() => setDialog(null)}
        />
      )}

      {/* ASSIGN / EDIT MEMBER */}
      {dialog?.kind === "member-form" && selectedSystem && (
        <MemberForm
          system={selectedSystem}
          member={dialog.item}
          actor={actor}
          onSaved={memberSaved}
          onClose={() => setDialog(null)}
        />
      )}

      {/* DELETE SYSTEM */}
      {dialog?.kind === "system-delete" && (
        <DeleteDialog
          kind="system"
          item={dialog.item}
          onSaved={systemDeleted}
          onClose={() => setDialog(null)}
        />
      )}

      {/* DELETE CATEGORY */}
      {dialog?.kind === "category-delete" && selectedSystem && (
        <DeleteDialog
          kind="category"
          item={dialog.item}
          system={selectedSystem}
          onSaved={(message) => categorySaved(null, message)}
          onClose={() => setDialog(null)}
        />
      )}

      {/* REMOVE MEMBER */}
      {dialog?.kind === "member-delete" && selectedSystem && (
        <DeleteDialog
          kind="member"
          item={dialog.item}
          system={selectedSystem}
          onSaved={memberSaved}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
