"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useUser();
  const createInterview = useMutation(api.Interviews.CreateInterview);
  const deleteInterview = useMutation(api.Interviews.DeleteInterview);
  const updateInterviewName = useMutation(
    api.Interviews.UpdateInterviewName
  );

  const interviews = useQuery(
    api.Interviews.ListByUser,
    user ? { userId: user.id } : "skip"
  );

  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"resume" | "job">("resume");
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
            console.error(
              "Failed to upload resume",
              await response.text()
            );
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
                data.webhookResult
              );

              const result: any = data.webhookResult as any;

              if (result) {
                if (Array.isArray(result.questions) && result.questions.length) {
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
    <main className="min-h-screen bg-background/60 text-foreground">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">My Dashboard</p>
            <h1 className="text-2xl font-semibold">
              Welcome{user?.firstName ? `, ${user.firstName}` : ""}
            </h1>
          </div>
          <Button size="lg" onClick={() => setShowCreateDialog(true)}>
            + Create Interview
          </Button>
        </header>

        {/* Empty state when no interviews */}
        {interviews && interviews.length === 0 && (
          <section className="mt-4 flex flex-1 items-center justify-center">
            <div className="w-full max-w-3xl rounded-3xl border-2 border-dashed border-muted-foreground/30 bg-background/70 px-8 py-16 text-center shadow-sm">
              <p className="mb-6 text-sm text-muted-foreground">
                You do not have any Interview created
              </p>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowCreateDialog(true)}
              >
                + Create Interview
              </Button>
            </div>
          </section>
        )}

        {/* List of existing interviews */}
        {interviews && interviews.length > 0 && (
          <section className="mt-4 w-full rounded-2xl border bg-background/80 p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-medium">Your interviews</h2>
            <div className="space-y-3">
              {interviews.map((iv) => (
                <div
                  key={iv._id}
                  className="flex items-center justify-between gap-4 rounded-xl border bg-muted/40 px-4 py-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    {editingId === iv._id ? (
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 min-w-0 rounded-md border bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
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
                          onClick={() => {
                            setEditingId(null);
                            setEditingValue("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="max-w-xs truncate font-medium">
                          {(iv.jobDescription &&
                          iv.jobDescription.trim().length > 0
                            ? iv.jobDescription
                            : iv.resumeFileName &&
                              iv.resumeFileName.trim().length > 0
                            ? iv.resumeFileName
                            : "Untitled interview")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {iv.resumeFileName || "No resume uploaded"}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId !== iv._id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const displayName =
                            (iv.jobDescription &&
                            iv.jobDescription.trim().length > 0
                              ? iv.jobDescription
                              : iv.resumeFileName &&
                                iv.resumeFileName.trim().length > 0
                              ? iv.resumeFileName
                              : "Untitled interview");
                          setEditingId(iv._id as string);
                          setEditingValue(displayName);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await deleteInterview({ interviewId: iv._id });
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Create Interview modal dialog */}
        {showCreateDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-xl rounded-2xl bg-background p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Please submit following details.
                  </h2>
                </div>
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCreateDialog(false)}
                >
                  ✕
                </button>
              </div>

              <div className="mb-6 inline-flex rounded-full bg-muted p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab("resume")}
                  className={`rounded-full px-4 py-1.5 ${
                    activeTab === "resume"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Resume Upload
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("job")}
                  className={`rounded-full px-4 py-1.5 ${
                    activeTab === "job"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Job Description
                </button>
              </div>

              <form
                onSubmit={handleCreate}
                className="flex flex-col gap-6"
              >
                {activeTab === "resume" && (
                  <div className="rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/40 px-6 py-10 text-center">
                    <p className="mb-2 text-sm font-medium">Upload file</p>
                    <p className="mb-6 text-xs text-muted-foreground">
                      Drag or drop your files here or click to upload
                    </p>
                    <label className="mx-auto flex h-28 w-28 cursor-pointer items-center justify-center rounded-2xl bg-background shadow-sm">
                      <span className="text-2xl">⬆</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) =>
                          setResumeFile(e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                    {resumeFile && (
                      <p className="mt-4 text-xs text-muted-foreground">
                        Selected: {resumeFile.name}
                      </p>
                    )}
                  </div>
                )}

                {activeTab === "job" && (
                  <div>
                    <label className="text-sm font-medium">
                      Job description
                      <textarea
                        className="mt-2 h-32 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        placeholder="Paste the job description here..."
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                      />
                    </label>
                  </div>
                )}

                {status && (
                  <p className="text-xs text-muted-foreground">{status}</p>
                )}

                <div className="mt-4 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating || !resumeFile}
                  >
                    {creating ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}