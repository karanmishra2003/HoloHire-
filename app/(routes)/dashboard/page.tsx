"use client";

import React, { useState, useContext } from "react";
import { Plus, Video } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { UserDetailContext } from "@/context/UserDetailContext";
import CreateInterviewDialog from "./_components/CreateInterviewDialog";
import InterviewCard from "./_components/InterviewCard";

export default function DashboardPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useContext(UserDetailContext);

  const interviews = useQuery(
    api.Interviews.ListByUser,
    user?.primaryEmailAddress?.emailAddress
      ? { userId: user.primaryEmailAddress.emailAddress }
      : "skip"
  );

  const hasInterviews = interviews && interviews.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0e17] text-white">
      {/* Dashboard welcome banner */}
      <div className="w-full border-b border-white/5 bg-[#0f1629]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 lg:px-8">
          <div>
            <p className="text-base font-medium text-cyan-400">My Dashboard</p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-white">
              Welcome, {user?.fullName ?? user?.firstName ?? "there"}
            </h1>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-semibold px-5 py-2.5 shadow-lg shadow-cyan-500/25"
          >
            <Plus className="size-4" />
            Create Interview
          </Button>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-10 px-6 py-16 lg:px-8">

        {/* ── Empty-state / create-another banner ── */}
        <div
          className={
            "flex aspect-square w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-8 text-center"
          }
        >
          <div className="mb-5 flex size-10 items-center justify-center rounded-full bg-cyan-500/10">
            <Video className="size-10 text-cyan-400" />
          </div>

          <h2 className="text-xl font-semibold text-white">
            {hasInterviews
              ? "Create another interview"
              : "No interviews yet"}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-400">
            {hasInterviews
              ? "Keep practicing — upload a new resume and job description to start another mock interview."
              : "Get started by uploading your resume and pasting a job description. Our AI will generate a tailored mock interview for you."}
          </p>

          <Button
            size="lg"
            onClick={() => setDialogOpen(true)}
            className="mt-7 bg-cyan-500 hover:bg-cyan-400 text-white font-medium px-6 shadow-lg shadow-cyan-500/20"
          >
            <Plus className="size-5" />
            Create Interview
          </Button>
        </div>
      </main>

      {/* ── Create Interview Dialog ── */}
      <CreateInterviewDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        userId={user?.primaryEmailAddress?.emailAddress ?? ""}
      />
    </div>
  );
}
