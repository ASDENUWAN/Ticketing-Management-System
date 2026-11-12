import { Construction } from "lucide-react";

export default function ModulePlaceholder({ title, description }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <Construction size={30} />
        </div>

        <h1 className="text-2xl font-bold">{title}</h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
          {description}
        </p>

        <div className="mt-6 inline-flex rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600">
          Frontend module in development
        </div>
      </div>
    </div>
  );
}
