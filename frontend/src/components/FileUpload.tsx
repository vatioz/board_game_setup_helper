import { useCallback, useRef, useState } from "react";
import { Upload, Loader2, X, FileText } from "lucide-react";

interface FileEntry {
  file: File;
  label: string;
}

interface Props {
  onUpload: (files: File[], labels: string[]) => void;
  loading: boolean;
}

export default function FileUpload({ onUpload, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      if (selected.length === 0) return;
      setEntries((prev) => [
        ...prev,
        ...selected.map((f) => ({
          file: f,
          label: f.name.replace(/\.pdf$/i, ""),
        })),
      ]);
      // reset so re-selecting the same files fires onChange again
      if (inputRef.current) inputRef.current.value = "";
    },
    []
  );

  const removeEntry = useCallback((idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateLabel = useCallback((idx: number, label: string) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, label } : e))
    );
  }, []);

  const handleSubmit = useCallback(() => {
    if (entries.length === 0) return;
    onUpload(
      entries.map((e) => e.file),
      entries.map((e) => e.label)
    );
    setEntries([]);
  }, [entries, onUpload]);

  return (
    <div className="inline-flex flex-col items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleChange}
        disabled={loading}
        hidden
      />

      <div className="flex items-center gap-2">
        <button
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-medium rounded-lg shadow-soft hover:shadow-soft-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-soft transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              {entries.length === 0
                ? "Select Rulebook PDF(s)"
                : "Add More PDFs"}
            </>
          )}
        </button>

        {entries.length > 0 && !loading && (
          <button
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-lg shadow-soft hover:shadow-soft-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 hover:scale-105"
            onClick={handleSubmit}
          >
            <Upload className="w-5 h-5" />
            Upload &amp; Extract ({entries.length} file{entries.length !== 1 ? "s" : ""})
          </button>
        )}
      </div>

      {entries.length > 0 && (
        <ul className="w-full max-w-lg space-y-2 mt-2">
          {entries.map((entry, idx) => (
            <li
              key={`${entry.file.name}-${idx}`}
              className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
            >
              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={entry.label}
                onChange={(e) => updateLabel(idx, e.target.value)}
                className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                placeholder="Label (e.g. Base Game)"
                disabled={loading}
              />
              <span className="text-xs text-slate-400 truncate max-w-[120px]" title={entry.file.name}>
                {entry.file.name}
              </span>
              {!loading && (
                <button
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  onClick={() => removeEntry(idx)}
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
