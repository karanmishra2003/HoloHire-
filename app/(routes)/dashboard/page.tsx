"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";

export default function DashboardPage() {
  const { user } = useUser();
  const createInterview = useMutation(api.Interviews.CreateInterview);
  const deleteInterview = useMutation(api.Interviews.DeleteInterview);
  const updateInterviewName = useMutation(api.Interviews.UpdateInterviewName);

  const interviews = useQuery(
    api.Interviews.ListByUser,
    user ? { userId: user.id } : "skip",
  );

  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!user) {
      setStatus("Please sign in to create an interview.");
      return;
    }

    if (!resumeFile) {
      setStatus("Please upload your resume before creating an interview.");
      return;
    }

    setCreating(true);
    try {
      let uploadedUrl: string | null = null;

      if (resumeFile) {
        try {
          const formData = new FormData();
          formData.append("file", resumeFile);

          const response = await fetch("/api/generate-interview-question", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            console.error("Failed to upload resume", await response.text());
          } else {
            const data = (await response.json()) as {
              url?: string;
              name?: string;
              webhookResult?: unknown;
              error?: string;
            };

            if (data?.url) {
              uploadedUrl = data.url;
              console.log("Uploaded resume URL (client):", data.url);
            }

            if (data?.webhookResult) {
              console.log(
                "Webhook result from server (client) - full:",
                data.webhookResult,
              );

              const result: any = data.webhookResult as any;

              if (result) {
                if (
                  Array.isArray(result.questions) &&
                  result.questions.length
                ) {
                  const first = result.questions[0];
                  if (first?.question) {
                    console.log("AI Question:", first.question);
                  }
                  if (first?.answer) {
                    console.log("AI Answer:", first.answer);
                  }
                } else {
                  if (result.question) {
                    console.log("AI Question:", result.question);
                  }
                  if (result.answer) {
                    console.log("AI Answer:", result.answer);
                  }
                }
              }
            }
          }
        } catch (uploadError) {
          console.error("Error while uploading resume:", uploadError);
        }
      }

      const resumeName = resumeFile ? resumeFile.name : "";
      await createInterview({
        userId: user.id,
        jobDescription,
        resumeFileName: resumeName,
      });
      setStatus("Interview created successfully.");
      setJobDescription("");
      setResumeFile(null);
      setShowCreateDialog(false);
    } catch (err) {
      console.error(err);
      setStatus("Failed to create interview. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Dashboard
        </h1>
        {/* Only show top button if there are interviews */}
        {interviews && interviews.length > 0 && (
          <Button onClick={() => setShowCreateDialog(true)}>
            + Create Interview
          </Button>
        )}
      </div>

      {/* Empty state when no interviews */}
      {interviews && interviews.length === 0 && (
        <section className="flex flex-1 flex-col items-center justify-center py-20">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm transition-all hover:bg-white/10 shadow-xl">
            <div className="mb-6 flex justify-center">
              <div className="p-4 bg-blue-500/10 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-blue-400"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M12 18v-6" />
                  <path d="M9 15h6" />
                </svg>
              </div>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">
              No Interviews Yet
            </h3>
            <p className="mb-8 text-sm text-gray-400">
              You do not have any interviews yet. Start by creating a new one!
            </p>
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-blue-500/20"
              onClick={() => setShowCreateDialog(true)}
            >
              Create Interview
            </Button>
          </div>
        </section>
      )}

      {/* List of existing interviews */}
      {interviews && interviews.length > 0 && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {interviews.map((iv) => (
            <div
              key={iv._id}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10 hover:shadow-xl hover:shadow-purple-500/10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingId === iv._id ? (
                      <div className="space-y-2">
                        <input
                          className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          autoFocus
                          placeholder="Interview Name"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={async () => {
                              const fallbackName =
                                (iv.resumeFileName ?? "").trim() ||
                                "Untitled interview";
                              const newName =
                                editingValue.trim() || fallbackName;
                              try {
                                await updateInterviewName({
                                  interviewId: iv._id,
                                  jobDescription: newName,
                                });
                                setEditingId(null);
                                setEditingValue("");
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-3 text-xs text-gray-400 hover:text-white"
                            onClick={() => {
                              setEditingId(null);
                              setEditingValue("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="truncate text-lg font-semibold text-white mb-1">
                          {iv.jobDescription &&
                          iv.jobDescription.trim().length > 0
                            ? iv.jobDescription
                            : iv.resumeFileName &&
                                iv.resumeFileName.trim().length > 0
                              ? iv.resumeFileName
                              : "Untitled interview"}
                        </h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          {iv.resumeFileName || "No resume uploaded"}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
                  {editingId !== iv._id && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-white/10"
                      onClick={() => {
                        const displayName =
                          iv.jobDescription &&
                          iv.jobDescription.trim().length > 0
                            ? iv.jobDescription
                            : iv.resumeFileName &&
                                iv.resumeFileName.trim().length > 0
                              ? iv.resumeFileName
                              : "Untitled interview";
                        setEditingId(iv._id as string);
                        setEditingValue(displayName);
                      }}
                    >
                      <span className="sr-only">Edit</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={async () => {
                      if (
                        confirm(
                          "Are you sure you want to delete this interview?",
                        )
                      ) {
                        try {
                          await deleteInterview({ interviewId: iv._id });
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }}
                  >
                    <span className="sr-only">Delete</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      <line x1="10" x2="10" y1="11" y2="17" />
                      <line x1="14" x2="14" y1="11" y2="17" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Create Interview modal dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a0e17] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  New Interview
                </h2>
                <p className="text-sm text-gray-400">
                  Upload your resume and optional job description to get
                  started.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                onClick={() => setShowCreateDialog(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-8">
              <div className="space-y-6">
                {/* Resume Upload */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                      1
                    </div>
                    Resume Upload <span className="text-red-400">*</span>
                  </label>
                  <FileUpload
                    onChange={(files) => setResumeFile(files[0] || null)}
                  />
                  {resumeFile && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span>Selected: {resumeFile.name}</span>
                    </div>
                  )}
                </div>

                {/* Job Description */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">
                      2
                    </div>
                    Job Description
                  </label>
                  <textarea
                    className="w-full h-32 resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder:text-gray-600 transition-all"
                    placeholder="Paste the job description here (optional)..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>
              </div>

              {status && (
                <div
                  className={`p-3 rounded-lg text-sm flex items-center gap-2 ${status.includes("success") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}
                >
                  {status.includes("success") ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  )}
                  {status}
                </div>
              )}

              <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateDialog(false)}
                  className="text-gray-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating || !resumeFile}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0"
                >
                  {creating ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Start Interview"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
