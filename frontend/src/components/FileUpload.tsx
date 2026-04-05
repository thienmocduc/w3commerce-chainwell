/**
 * WellKOC — FileUpload Component (reusable)
 *
 * Drag-and-drop or click-to-select file upload.
 * Sends to backend POST /upload → S3, returns CDN URL.
 *
 * Props:
 *  - folder: 'product' | 'avatar' | 'license' | 'kyc' | 'other'
 *  - accept: MIME types or extensions (default: images + PDF)
 *  - multiple: allow multiple files (default: false)
 *  - onUpload: callback with CDN URLs after successful upload
 *  - maxSizeMB: client-side size guard (default: 10)
 *  - label: optional button label
 *  - disabled: disable the component
 */

import React, { useCallback, useRef, useState } from 'react';
import { uploadApi, UploadFolder, UploadResult } from '@lib/api';
import { useAuth } from '@hooks/useAuth';

interface FileUploadProps {
  folder?: UploadFolder;
  accept?: string;
  multiple?: boolean;
  onUpload: (results: UploadResult[]) => void;
  onError?: (msg: string) => void;
  maxSizeMB?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function FileUpload({
  folder = 'other',
  accept = 'image/jpeg,image/png,image/webp,image/gif,application/pdf',
  multiple = false,
  onUpload,
  onError,
  maxSizeMB = 10,
  label = 'Chọn file hoặc kéo thả',
  disabled = false,
  className = '',
  children,
}: FileUploadProps) {
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (!token) {
        onError?.('Bạn cần đăng nhập để upload file');
        return;
      }

      const fileArr = Array.from(files);

      // Client-side size check
      const oversized = fileArr.find((f) => f.size > maxSizeMB * 1024 * 1024);
      if (oversized) {
        onError?.(`File "${oversized.name}" vượt quá ${maxSizeMB}MB`);
        return;
      }

      setUploading(true);
      try {
        const results = await Promise.all(
          fileArr.map((file) => uploadApi.upload(file, folder, token)),
        );
        onUpload(results);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload thất bại';
        onError?.(msg);
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [token, folder, maxSizeMB, onUpload, onError],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleClick = () => {
    if (!disabled && !uploading) inputRef.current?.click();
  };

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={[
        'relative flex flex-col items-center justify-center cursor-pointer',
        'border-2 border-dashed rounded-xl p-6 transition-colors',
        dragOver
          ? 'border-purple-500 bg-purple-50'
          : 'border-gray-300 hover:border-purple-400 bg-gray-50',
        disabled || uploading ? 'opacity-50 cursor-not-allowed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="button"
      aria-label={label}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
        disabled={disabled || uploading}
        aria-hidden="true"
      />

      {children ?? (
        <>
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <svg
                className="animate-spin h-8 w-8 text-purple-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span className="text-sm text-purple-600 font-medium">Đang upload...</span>
            </div>
          ) : (
            <>
              <svg
                className="h-10 w-10 text-gray-400 mb-2"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-sm text-gray-600 font-medium">{label}</p>
              <p className="text-xs text-gray-400 mt-1">
                JPG, PNG, WebP, GIF, PDF · tối đa {maxSizeMB}MB
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
