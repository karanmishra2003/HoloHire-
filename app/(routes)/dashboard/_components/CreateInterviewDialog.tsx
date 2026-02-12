"use client";

import React, { useState } from "react";
import { X, Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { upload } from "@imagekit/next";

interface CreateInterviewDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onCreated?: () => void;
}

export default function CreateInterviewDialog({
  open,
  onClose,
  userId,
  onCreated,
}: CreateInterviewDialogProps) {
  const [activeTab, setActiveTab] = useState<"resume" | "job">("resume");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const createInterview = useMutation(api.Interviews.CreateInterview);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setResumeFile(file);
  };

  /** Fetches one-time upload auth params from our server */
  const authenticator = async () => {
    const response = await fetch("/api/upload-auth");
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Auth request failed with status ${response.status}: ${errorText}`
      );
    }
    const data = await response.json();
    const { signature, expire, token, publicKey } = data;
    return { signature, expire, token, publicKey };
  };

  const handleCreate = async () => {
    // Require at least a resume or a job description
    if (!jobDescription.trim() && !resumeFile) return;
    setLoading(true);
    setUploadProgress(0);

    try {
      let resumeUrl: string | undefined;

      // ── Upload resume to ImageKit if a file was selected ──
      if (resumeFile) {
        const authParams = await authenticator();

        const uploadResponse = await upload({
          file: resumeFile,
          fileName: resumeFile.name,
          ...authParams,
          folder: "/resumes",
          onProgress: (event) => {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          },
        });

        resumeUrl = uploadResponse.url;
        console.log("✅ Resume uploaded to ImageKit:", resumeUrl);
      }

      // ── Save interview record to Convex ──
      await createInterview({
        userId,
        jobDescription: jobDescription.trim(),
        resumeFileName: resumeFile?.name ?? "No resume uploaded",
        resumeUrl,
      });

      // ── Call n8n webhook to generate interview questions ──
      if (resumeUrl) {
        const formData = new FormData();
        formData.append("resumeUrl", resumeUrl);
        const res = await fetch("/api/generate-interview-questions", {
          method: "POST",
          body: formData,
        });
        const questionsData = await res.json();
        const rawText = questionsData?.data?.content?.parts?.[0]?.text
          || questionsData?.data?.[0]?.content?.parts?.[0]?.text
          || questionsData?.data?.text
          || "";
        // Extract JSON array from the raw text
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        const qnaList = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        console.log("📋 Interview Questions & Answers:", qnaList);
      } else if (jobDescription.trim()) {
        const res = await fetch("/api/generate-interview-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: jobDescription.trim() }),
        });
        const questionsData = await res.json();
        const rawText = questionsData?.data?.content?.parts?.[0]?.text
          || questionsData?.data?.[0]?.content?.parts?.[0]?.text
          || questionsData?.data?.text
          || "";
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        const qnaList = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        console.log("📋 Interview Questions & Answers:", qnaList);
      }

      // Reset state
      setJobDescription("");
      setResumeFile(null);
      setActiveTab("resume");
      setUploadProgress(0);
      onCreated?.();
      onClose();
    } catch (err) {
      console.error("Failed to create interview:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111827] px-8 py-8 sm:px-12 sm:py-10 shadow-2xl max-h-[80vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" />
        </button>

        {/* Title */}
        <h2 className="text-xl font-bold text-white">
          Please submit following details.
        </h2>

        {/* Tabs */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setActiveTab("resume")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${activeTab === "resume"
              ? "bg-white/10 text-white border border-white/20"
              : "text-gray-400 border border-transparent hover:text-white hover:bg-white/5"
              }`}
          >
            Resume Upload
          </button>
          <button
            onClick={() => setActiveTab("job")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${activeTab === "job"
              ? "bg-white/10 text-white border border-white/20"
              : "text-gray-400 border border-transparent hover:text-white hover:bg-white/5"
              }`}
          >
            Job Description
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === "resume" ? (
            <div>
              <label className="mb-3 block text-sm font-semibold text-white">
                Upload resume
              </label>
              <label className="flex h-52 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-cyan-500/40 bg-white/[0.03] text-sm text-gray-400 transition hover:border-cyan-400 hover:bg-white/[0.06]">
                {resumeFile ? (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <FileText className="size-5" />
                    <span className="max-w-[280px] truncate">
                      {resumeFile.name}
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="size-6 text-gray-500" />
                    <span>Click to upload your resume</span>
                    <span className="text-xs text-gray-500">
                      PDF, DOC, DOCX accepted
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          ) : (
            <div>
              <label className="mb-3 block text-sm font-semibold text-white">
                Job description
              </label>
              <textarea
                rows={8}
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full rounded-xl border border-cyan-500/40 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>
          )}
        </div>

        {/* Upload Progress Bar */}
        {loading && resumeFile && uploadProgress < 100 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
              <span>Uploading resume…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex items-center justify-end gap-4">
          <button
            onClick={onClose}
            className="text-sm font-medium text-gray-300 transition hover:text-white"
          >
            Cancel
          </button>
          <Button
            disabled={(!jobDescription.trim() && !resumeFile) || loading}
            onClick={handleCreate}
            className="rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-semibold px-6 py-2.5 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {loading ? "Uploading…" : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
