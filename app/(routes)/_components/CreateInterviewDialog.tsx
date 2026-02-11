"use client";

interface CreateInterviewDialogProps {
  open?: boolean;
}

export default function CreateInterviewDialog({ open }: CreateInterviewDialogProps) {
  if (!open) return null;

  return (
    <div>
      {/* TODO: Implement CreateInterviewDialog UI */}
      <p>Create Interview Dialog</p>
    </div>
  );
}
