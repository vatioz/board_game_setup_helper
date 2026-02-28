import { useCallback, useRef } from "react";

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
    <div className="file-upload">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleChange}
        disabled={loading}
        hidden
      />
      <button
        className="btn btn-primary"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? "Processing…" : "Upload Rulebook PDF"}
      </button>
      {loading && <div className="spinner" />}
    </div>
  );
}
