"use client";

import React from "react";
import { FileText, Trash2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface InterviewCardProps {
  id: Id<"Interviews">;
  jobDescription: string;
  resumeFileName: string;
  createdAt: number;
}

export default function InterviewCard({
  id,
  jobDescription,
  resumeFileName,
  createdAt,
}: InterviewCardProps) {
  const deleteInterview = useMutation(api.Interviews.DeleteInterview);

  const handleDelete = async () => {
    await deleteInterview({ interviewId: id });
  };

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-cyan-500/30 hover:bg-white/[0.07]">
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-500 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
        title="Delete interview"
      >
        <Trash2 className="size-4" />
      </button>

      {/* Resume */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <FileText className="size-4 text-cyan-400" />
        <span className="max-w-[200px] truncate">{resumeFileName}</span>
      </div>

      {/* Job description excerpt */}
      <p className="line-clamp-3 text-sm leading-relaxed text-gray-300">
        {jobDescription}
      </p>

      {/* Date */}
      <span className="mt-auto text-xs text-gray-500">
        {new Date(createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
    </div>
  );
}
