"use client";

import React from "react";

interface FileUploadProps {
  onChange?: (files: File[]) => void;
}

export function FileUpload({ onChange }: FileUploadProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    onChange?.(files as File[]);
  };

  return (
    <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-500 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:bg-neutral-800">
      <span>Select or drop your resume</span>
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleChange}
      />
    </label>
  );
}
