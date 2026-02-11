"use client";

import { useContext, useState } from "react";
import { UserDetailContext } from "@/context/UserDetailContext";

import DashboardHeader from "./components/DashboardHeader";
import EmptyStateBanner from "./components/EmptyStateBanner";
import InterviewList, { type Interview } from "./components/InterviewList";
import CreateInterviewModal from "./components/CreateInterviewModal";

export default function DashboardPage() {
  const { user } = useContext(UserDetailContext) || {};
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [interviews, setInterviews] = useState<Interview[]>([]);

  /* ── handlers ───────────────────────────────── */
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const addInterview = (fileName: string) => {
    setInterviews((prev) => [
      {
        id: crypto.randomUUID(),
        title: "Untitled interview",
        fileName,
      },
      ...prev,
    ]);
    closeModal();
  };

  const handleSubmitJob = (description: string) => {
    void description; // will be used when backend is wired
    addInterview("JobDescription.txt");
  };

  const handleSubmitResume = (file: File) => {
    addInterview(file.name);
  };

  const handleDelete = (id: string) => {
    setInterviews((prev) => prev.filter((i) => i.id !== id));
  };

  /* ── render ─────────────────────────────────── */
  return (
    <main className="space-y-8">
      <DashboardHeader
        userName={user?.firstName}
        onCreateInterview={openModal}
      />

      <section className="animate-[fadeIn_0.3s_ease-out]">
        {interviews.length === 0 ? (
          <EmptyStateBanner onCreateInterview={openModal} />
        ) : (
          <InterviewList interviews={interviews} onDelete={handleDelete} />
        )}
      </section>

      <CreateInterviewModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmitJob={handleSubmitJob}
        onSubmitResume={handleSubmitResume}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
