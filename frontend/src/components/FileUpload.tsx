import { useCallback, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";

interface Props {
  onUpload: (file: File) => void;
  loading: boolean;
}

export default function FileUpload({ onUpload, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onUpload(file);
    },
    [onUpload]
  );

  return (
    <div className="inline-flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleChange}
        disabled={loading}
        hidden
      />
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
            Upload Rulebook PDF
          </>
        )}
      </button>
    </div>
  );
}
