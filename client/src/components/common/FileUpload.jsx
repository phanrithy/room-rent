import React, { useState, useRef } from 'react';
import { Upload, File, X, AlertCircle } from 'lucide-react';

export function FileUpload({
  onFileSelect,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSizeMb = 5,
  label = 'Upload Document',
  helperText = 'PDF, JPG, PNG up to 5 MB',
  error = null,
  disabled = false,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [localError, setLocalError] = useState(null);
  const fileInputRef = useRef(null);

  const validateAndSetFile = (file) => {
    setLocalError(null);
    if (!file) return;

    if (file.size > maxSizeMb * 1024 * 1024) {
      setLocalError(`File size exceeds ${maxSizeMb} MB limit`);
      return;
    }

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setLocalError('Only PDF, JPG, and PNG files are allowed');
      return;
    }

    setSelectedFile(file);
    if (onFileSelect) onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setLocalError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onFileSelect) onFileSelect(null);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
          {label}
        </span>
      )}

      {!selectedFile ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-surface-subtle/50 hover:bg-surface-subtle ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            error || localError
              ? 'border-danger'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={(e) => {
              if (e.target.files?.length > 0) {
                validateAndSetFile(e.target.files[0]);
              }
            }}
            className="hidden"
            disabled={disabled}
          />
          <div className="p-3 bg-surface rounded-full border border-border shadow-xs text-content-muted mb-2">
            <Upload className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-content-primary">
            Click to upload or drag & drop
          </p>
          <p className="text-xs text-content-muted mt-1">{helperText}</p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3.5 bg-surface border border-border rounded-lg shadow-xs">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-primary-light text-primary rounded-md">
              <File className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-content-primary truncate">{selectedFile.name}</p>
              <p className="text-xs text-content-muted">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded text-content-muted hover:text-danger hover:bg-danger-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {(error || localError) && (
        <p className="text-xs text-danger font-medium flex items-center gap-1 mt-0.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error || localError}</span>
        </p>
      )}
    </div>
  );
}
