import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  KeyRound,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { can } from "../../utils/permissions";
import Modal from "../../components/ui/Modal";
import useTimedMessage from "../../hooks/useTimedMessage";

import { categoriesApi, categoryApiError } from "./categoriesApi";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-500";

const actionClass =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50";

function makeCode(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[^a-z]+/, "");
}

function validCode(value) {
  return /^[a-z][a-z0-9_]*$/.test(value);
}

function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      {message}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Category Type Form
|--------------------------------------------------------------------------
*/

function CategoryTypeForm({ type, onClose, onSaved }) {
  const editing = Boolean(type);

  const [name, setName] = useState(type?.name ?? "");
  const [code, setCode] = useState(type?.code ?? "");
  const [description, setDescription] = useState(type?.description ?? "");
  const [active, setActive] = useState(type?.is_active ?? true);

  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const errorNotice = useTimedMessage(30000);

  function changeName(value) {
    const oldCode = makeCode(name);

    if (!editing && (!code || code === oldCode)) {
      setCode(makeCode(value));
    }

    setName(value);
    setErrors({});
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy) return;

    setErrors({});
    errorNotice.clear();

    if (name.trim().length < 2) {
      setErrors({
        name: ["Enter at least 2 characters."],
      });
      return;
    }

    if (!editing && !validCode(code)) {
      setErrors({
        code: ["Use a code such as ticket_source."],
      });
      return;
    }

    setBusy(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        is_active: active,
      };

      const response = editing
        ? await categoriesApi.updateType(type.id, payload)
        : await categoriesApi.createType({
            ...payload,
            code,
          });

      onSaved(
        response.data,
        editing
          ? "Category type updated successfully."
          : "Category type created successfully.",
      );

      onClose();
    } catch (error) {
      setErrors(error.response?.data?.errors ?? {});

      errorNotice.show(categoryApiError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit category type" : "Create category type"}
      description="Configure a group of related categories."
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <ErrorBanner message={errorNotice.message} />

        <div>
          <label
            htmlFor="type-name"
            className="text-sm font-semibold text-slate-700"
          >
            Type name *
          </label>

          <input
            id="type-name"
            value={name}
            onChange={(event) => changeName(event.target.value)}
            className={inputClass}
            maxLength={100}
            placeholder="e.g. Ticket Source"
            required
          />

          {errors.name?.[0] && (
            <p className="mt-1 text-xs text-red-700">{errors.name[0]}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="type-code"
            className="text-sm font-semibold text-slate-700"
          >
            Type code *
          </label>

          <input
            id="type-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toLowerCase())}
            disabled={editing}
            className={`${inputClass} font-mono`}
            maxLength={64}
            placeholder="ticket_source"
            required
          />

          {errors.code?.[0] && (
            <p className="mt-1 text-xs text-red-700">{errors.code[0]}</p>
          )}

          <p className="mt-2 text-xs text-slate-500">
            This identifier cannot be changed after creation.
          </p>
        </div>

        <div>
          <label
            htmlFor="type-description"
            className="text-sm font-semibold text-slate-700"
          >
            Description
          </label>

          <textarea
            id="type-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={500}
            className={inputClass}
            placeholder="Describe this category type..."
          />

          {errors.description?.[0] && (
            <p className="mt-1 text-xs text-red-700">{errors.description[0]}</p>
          )}
        </div>

        <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            disabled={Boolean(type?.is_system)}
            className="h-4 w-4 accent-[#8A0007]"
          />

          <span className="text-sm text-slate-700">Active category type</span>
        </label>

        {type?.is_system && (
          <p className="text-xs text-amber-800">
            Core category types must remain active.
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={actionClass}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
          >
            {busy ? "Saving..." : editing ? "Save changes" : "Create type"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/*
|--------------------------------------------------------------------------
| Category Form
|--------------------------------------------------------------------------
*/

function CategoryForm({ category, categoryType, onClose, onSaved }) {
  const editing = Boolean(category);

  const [name, setName] = useState(category?.name ?? "");
  const [code, setCode] = useState(category?.code ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? 0));
  const [active, setActive] = useState(category?.is_active ?? true);

  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const errorNotice = useTimedMessage(30000);

  function changeName(value) {
    const oldCode = makeCode(name);

    if (!editing && (!code || code === oldCode)) {
      setCode(makeCode(value));
    }

    setName(value);
    setErrors({});
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy) return;

    setErrors({});
    errorNotice.clear();

    if (name.trim().length < 2) {
      setErrors({
        name: ["Enter at least 2 characters."],
      });
      return;
    }

    if (!editing && !validCode(code)) {
      setErrors({
        code: ["Enter a valid category code."],
      });
      return;
    }

    const order = Number(sortOrder);

    if (!Number.isInteger(order) || order < 0 || order > 65535) {
      setErrors({
        sort_order: ["Sort order must be between 0 and 65535."],
      });
      return;
    }

    setBusy(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        sort_order: order,
        is_active: active,
      };

      const response = editing
        ? await categoriesApi.updateCategory(category.id, payload)
        : await categoriesApi.createCategory({
            ...payload,
            category_type_id: categoryType.id,
            code,
          });

      onSaved(
        response.data,
        editing
          ? "Category updated successfully."
          : "Category created successfully.",
      );

      onClose();
    } catch (error) {
      setErrors(error.response?.data?.errors ?? {});

      errorNotice.show(categoryApiError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit category" : "Create category"}
      description={`Category type: ${categoryType.name}`}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <ErrorBanner message={errorNotice.message} />

        <div>
          <label
            htmlFor="category-name"
            className="text-sm font-semibold text-slate-700"
          >
            Category name *
          </label>

          <input
            id="category-name"
            value={name}
            onChange={(event) => changeName(event.target.value)}
            className={inputClass}
            maxLength={100}
            placeholder="e.g. Urgent"
            required
          />

          {errors.name?.[0] && (
            <p className="mt-1 text-xs text-red-700">{errors.name[0]}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="category-code"
            className="text-sm font-semibold text-slate-700"
          >
            Category code *
          </label>

          <input
            id="category-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toLowerCase())}
            disabled={editing}
            className={`${inputClass} font-mono`}
            maxLength={64}
            required
          />

          {errors.code?.[0] && (
            <p className="mt-1 text-xs text-red-700">{errors.code[0]}</p>
          )}

          <p className="mt-2 text-xs text-slate-500">
            The code is permanent within this category type.
          </p>
        </div>

        <div>
          <label
            htmlFor="category-description"
            className="text-sm font-semibold text-slate-700"
          >
            Description
          </label>

          <textarea
            id="category-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={500}
            className={inputClass}
          />

          {errors.description?.[0] && (
            <p className="mt-1 text-xs text-red-700">{errors.description[0]}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="category-sort"
            className="text-sm font-semibold text-slate-700"
          >
            Sort order
          </label>

          <input
            id="category-sort"
            type="number"
            min={0}
            max={65535}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className={inputClass}
          />

          {errors.sort_order?.[0] && (
            <p className="mt-1 text-xs text-red-700">{errors.sort_order[0]}</p>
          )}
        </div>

        <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            disabled={Boolean(category?.is_system)}
            className="h-4 w-4 accent-[#8A0007]"
          />

          <span className="text-sm text-slate-700">Active category</span>
        </label>

        {category?.is_system && (
          <p className="text-xs text-amber-800">
            Core categories must remain active.
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={actionClass}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
          >
            {busy ? "Saving..." : editing ? "Save changes" : "Create category"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/*
|--------------------------------------------------------------------------
| Delete Confirmation Dialog
|--------------------------------------------------------------------------
*/

function DeleteDialog({ item, kind, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const errorNotice = useTimedMessage(30000);

  const isType = kind === "type";

  async function handleDelete() {
    if (busy) return;

    setBusy(true);
    errorNotice.clear();

    try {
      if (isType) {
        await categoriesApi.deleteType(item.id);
      } else {
        await categoriesApi.deleteCategory(item.id);
      }

      onDeleted(
        isType
          ? "Category type deleted successfully."
          : "Category deleted successfully.",
      );

      onClose();
    } catch (error) {
      errorNotice.show(categoryApiError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={isType ? "Delete category type" : "Delete category"}
      description="Confirm this permanent action."
      onClose={onClose}
      busy={busy}
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={22} className="shrink-0 text-red-700" />

          <p className="text-sm leading-6 text-red-900">
            Delete <strong>{item.name}</strong>? This action cannot be undone.
          </p>
        </div>

        <p className="text-sm leading-6 text-slate-600">
          {isType
            ? "A category type cannot be deleted while it contains categories."
            : "A category cannot be deleted if it is protected or used by another record."}
        </p>

        <ErrorBanner message={errorNotice.message} />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={actionClass}
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
            {busy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/*
|--------------------------------------------------------------------------
| Main Category Management Page
|--------------------------------------------------------------------------
*/

export default function CategoriesPage() {
  const { user: actor } = useAuth();

  const [types, setTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState(null);

  const [typeSearch, setTypeSearch] = useState("");
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesFailed, setTypesFailed] = useState(false);
  const [typesRefresh, setTypesRefresh] = useState(0);

  const [categories, setCategories] = useState([]);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryTerm, setCategoryTerm] = useState("");

  const [categoriesRefresh, setCategoriesRefresh] = useState(0);

  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [categoriesFailed, setCategoriesFailed] = useState(false);

  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });

  const [dialog, setDialog] = useState(null);

  const notice = useTimedMessage(30000);
  const typeError = useTimedMessage(30000);
  const categoryError = useTimedMessage(30000);

  const showTypeError = typeError.show;
  const clearTypeError = typeError.clear;

  const showCategoryError = categoryError.show;
  const clearCategoryError = categoryError.clear;

  const selectedType = useMemo(
    () => types.find((type) => type.id === selectedTypeId) ?? null,
    [types, selectedTypeId],
  );

  const visibleTypes = useMemo(() => {
    const term = typeSearch.trim().toLowerCase();

    return types.filter(
      (type) =>
        !term ||
        type.name.toLowerCase().includes(term) ||
        type.code.toLowerCase().includes(term),
    );
  }, [types, typeSearch]);

  // Load category types.
  useEffect(() => {
    let active = true;

    async function loadTypes() {
      setTypesLoading(true);
      setTypesFailed(false);
      clearTypeError();

      try {
        const response = await categoriesApi.listTypes();

        if (!active) return;

        const items = response.data ?? [];

        setTypes(items);

        setSelectedTypeId((previous) =>
          items.some((item) => item.id === previous)
            ? previous
            : (items[0]?.id ?? null),
        );
      } catch (error) {
        if (!active) return;

        setTypesFailed(true);
        showTypeError(categoryApiError(error));
      } finally {
        if (active) {
          setTypesLoading(false);
        }
      }
    }

    loadTypes();

    return () => {
      active = false;
    };
  }, [typesRefresh, showTypeError, clearTypeError]);

  // Debounce category search.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCategoryPage(1);
      setCategoryTerm(categorySearch.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [categorySearch]);

  // Load categories for the selected type.
  useEffect(() => {
    if (selectedTypeId === null) {
      setCategories([]);
      setCategoriesLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadCategories() {
      setCategoriesLoading(true);
      setCategoriesFailed(false);
      clearCategoryError();

      try {
        const response = await categoriesApi.listCategories({
          categoryTypeId: selectedTypeId,
          page: categoryPage,
          search: categoryTerm,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const nextMeta = {
          current_page: Number(response.meta?.current_page ?? 1),
          last_page: Math.max(1, Number(response.meta?.last_page ?? 1)),
          per_page: Number(response.meta?.per_page ?? 20),
          total: Number(response.meta?.total ?? 0),
        };

        if (categoryPage > nextMeta.last_page) {
          setCategoryPage(nextMeta.last_page);
          return;
        }

        setCategories(response.data ?? []);
        setMeta(nextMeta);
      } catch (error) {
        if (controller.signal.aborted) return;

        setCategories([]);
        setCategoriesFailed(true);
        showCategoryError(categoryApiError(error));
      } finally {
        if (!controller.signal.aborted) {
          setCategoriesLoading(false);
        }
      }
    }

    loadCategories();

    return () => controller.abort();
  }, [
    selectedTypeId,
    categoryPage,
    categoryTerm,
    categoriesRefresh,
    showCategoryError,
    clearCategoryError,
  ]);

  function selectType(id) {
    setSelectedTypeId(id);
    setCategoryPage(1);
    setCategorySearch("");
    setCategoryTerm("");
  }

  function handleSavedType(type, message) {
    notice.show(message);

    if (type?.id) {
      setSelectedTypeId(type.id);
    }

    setTypesRefresh((value) => value + 1);
    setCategoriesRefresh((value) => value + 1);
    setCategoryPage(1);
  }

  function handleDeletedType(message) {
    notice.show(message);

    setSelectedTypeId(null);
    setTypesRefresh((value) => value + 1);
    setCategoriesRefresh((value) => value + 1);
    setCategoryPage(1);
  }

  function handleSavedCategory(_category, message) {
    notice.show(message);

    setTypesRefresh((value) => value + 1);
    setCategoriesRefresh((value) => value + 1);
  }

  function handleDeletedCategory(message) {
    notice.show(message);

    setTypesRefresh((value) => value + 1);
    setCategoriesRefresh((value) => value + 1);
  }

  const canCreateType = can(actor, "category_types.create");

  const canUpdateType = can(actor, "category_types.update");

  const canDeleteType = can(actor, "category_types.delete");

  const canCreateCategory = can(actor, "categories.create");

  const canUpdateCategory = can(actor, "categories.update");

  const canDeleteCategory = can(actor, "categories.delete");

  const from = meta.total ? (meta.current_page - 1) * meta.per_page + 1 : 0;

  const to = meta.total
    ? Math.min(from + categories.length - 1, meta.total)
    : 0;

  return (
    <div className="space-y-6">
      {/* PAGE HEADING */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Category Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Configure ticket types, priorities, statuses, and other category
            groups.
          </p>
        </div>

        {canCreateType && (
          <button
            type="button"
            onClick={() =>
              setDialog({
                kind: "type-form",
                item: null,
              })
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-deep"
          >
            <Plus size={18} />
            New category type
          </button>
        )}
      </div>

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-red-50 p-3 text-brand">
            <Layers3 size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Category types</p>
            <p className="mt-1 text-2xl font-bold">{types.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-amber-50 p-3 text-amber-800">
            <Tag size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500">
              Categories in selected type
            </p>
            <p className="mt-1 text-2xl font-bold">
              {selectedType?.categories_count ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {notice.message && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <span>{notice.message}</span>
          <button
            type="button"
            onClick={notice.clear}
            className="font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <ErrorBanner message={typeError.message} />
      <ErrorBanner message={categoryError.message} />

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* CATEGORY TYPES */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <FolderTree size={19} className="text-brand" />
              <h2 className="font-semibold text-slate-900">Category Types</h2>
            </div>

            <div className="relative mt-4">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={typeSearch}
                onChange={(event) => setTypeSearch(event.target.value)}
                placeholder="Search types..."
                aria-label="Search category types"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="max-h-[600px] space-y-1 overflow-y-auto p-3">
            {typesLoading ? (
              <p className="p-4 text-sm text-slate-500">
                Loading category types...
              </p>
            ) : typesFailed ? (
              <p className="p-4 text-sm text-red-700">
                Could not load category types.
              </p>
            ) : visibleTypes.length ? (
              visibleTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => selectType(type.id)}
                  className={[
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                    selectedTypeId === type.id
                      ? "bg-red-50 text-brand"
                      : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <Layers3 size={18} className="shrink-0" />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {type.name}
                    </span>

                    <span className="mt-1 block truncate font-mono text-xs text-slate-500">
                      {type.code}
                    </span>
                  </span>

                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">
                    {type.categories_count}
                  </span>
                </button>
              ))
            ) : (
              <p className="p-4 text-sm text-slate-500">
                No category types found.
              </p>
            )}
          </div>
        </section>

        {/* SELECTED TYPE'S CATEGORIES */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {!selectedType ? (
            <div className="p-12 text-center">
              <Layers3 size={32} className="mx-auto text-slate-400" />
              <p className="mt-4 text-sm text-slate-500">
                Select a category type to view its categories.
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-900">
                      {selectedType.name}
                    </h2>

                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {selectedType.code}
                    </p>

                    {selectedType.description && (
                      <p className="mt-2 text-sm text-slate-500">
                        {selectedType.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedType.is_system && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-900">
                          Protected type
                        </span>
                      )}

                      <span
                        className={
                          selectedType.is_active
                            ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800"
                            : "rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                        }
                      >
                        {selectedType.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canUpdateType && (
                      <button
                        type="button"
                        onClick={() =>
                          setDialog({
                            kind: "type-form",
                            item: selectedType,
                          })
                        }
                        className={actionClass}
                      >
                        <Pencil size={15} />
                        Edit type
                      </button>
                    )}

                    {canDeleteType && !selectedType.is_system && (
                      <button
                        type="button"
                        onClick={() =>
                          setDialog({
                            kind: "type-delete",
                            item: selectedType,
                          })
                        }
                        className={`${actionClass} hover:text-red-700`}
                      >
                        <Trash2 size={15} />
                        Delete type
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <h3 className="font-semibold text-slate-900">Categories</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Manage values within this type.
                  </p>
                </div>

                {canCreateCategory && selectedType.is_active && (
                  <button
                    type="button"
                    onClick={() =>
                      setDialog({
                        kind: "category-form",
                        item: null,
                      })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
                  >
                    <Plus size={17} />
                    Add category
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 px-5 pb-5 sm:px-6">
                <div className="relative min-w-0 flex-1">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="search"
                    value={categorySearch}
                    maxLength={100}
                    onChange={(event) => setCategorySearch(event.target.value)}
                    placeholder="Search categories..."
                    aria-label="Search categories"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setCategoriesRefresh((v) => v + 1)}
                  disabled={categoriesLoading}
                  aria-label="Refresh categories"
                  className={actionClass}
                >
                  <RefreshCw
                    size={17}
                    className={categoriesLoading ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>

              {/* CATEGORY RECORDS */}
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {categoriesLoading ? (
                  <div className="p-12 text-center text-sm text-slate-500">
                    Loading categories...
                  </div>
                ) : categoriesFailed ? (
                  <div className="p-12 text-center text-sm text-red-700">
                    Unable to load categories.
                  </div>
                ) : !categories.length ? (
                  <div className="p-12 text-center text-sm text-slate-500">
                    No categories found.
                  </div>
                ) : (
                  categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                          <Tag size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {category.name}
                          </p>

                          <p className="mt-1 break-all font-mono text-xs text-slate-500">
                            {category.code}
                          </p>

                          {category.description && (
                            <p className="mt-2 text-xs text-slate-500">
                              {category.description}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap gap-2">
                            {category.is_system && (
                              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-900">
                                Protected
                              </span>
                            )}

                            <span
                              className={
                                category.is_active
                                  ? "rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800"
                                  : "rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500"
                              }
                            >
                              {category.is_active ? "Active" : "Inactive"}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                              Order: {category.sort_order}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {canUpdateCategory && (
                          <button
                            type="button"
                            onClick={() =>
                              setDialog({
                                kind: "category-form",
                                item: category,
                              })
                            }
                            className={actionClass}
                          >
                            <Pencil size={15} />
                            Edit
                          </button>
                        )}

                        {canDeleteCategory && !category.is_system && (
                          <button
                            type="button"
                            onClick={() =>
                              setDialog({
                                kind: "category-delete",
                                item: category,
                              })
                            }
                            className={`${actionClass} hover:text-red-700`}
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

              {/* PAGINATION */}
              {!categoriesLoading && !categoriesFailed && meta.total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
                  <p className="text-xs text-slate-500">
                    Showing {from}–{to} of {meta.total}
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={categoryPage <= 1}
                      onClick={() => setCategoryPage((p) => p - 1)}
                      className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <span className="text-xs text-slate-600">
                      Page {meta.current_page} of {meta.last_page}
                    </span>

                    <button
                      type="button"
                      disabled={categoryPage >= meta.last_page}
                      onClick={() => setCategoryPage((p) => p + 1)}
                      className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* DIALOGS */}
      {dialog?.kind === "type-form" && (
        <CategoryTypeForm
          type={dialog.item}
          onSaved={handleSavedType}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === "category-form" && selectedType && (
        <CategoryForm
          category={dialog.item}
          categoryType={selectedType}
          onSaved={handleSavedCategory}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === "type-delete" && (
        <DeleteDialog
          item={dialog.item}
          kind="type"
          onDeleted={handleDeletedType}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === "category-delete" && (
        <DeleteDialog
          item={dialog.item}
          kind="category"
          onDeleted={handleDeletedCategory}
          onClose={() => setDialog(null)}
        />
      )}

      <p className="text-xs leading-6 text-slate-500">
        Protected ticket categories remain available for system workflows. New
        categories and types can be created dynamically by authorized users.
      </p>
    </div>
  );
}
