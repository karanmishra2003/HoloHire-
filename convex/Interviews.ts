import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new interview for a user
export const CreateInterview = mutation({
  args: {
    userId: v.string(),
    jobDescription: v.string(),
    resumeFileName: v.string(),
    resumeUrl: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const id = await ctx.db.insert("Interviews", {
      userId: args.userId,
      jobDescription: args.jobDescription,
      resumeFileName: args.resumeFileName,
      resumeUrl: args.resumeUrl,
      createdAt: Date.now(),
    });

    return id;
  },
});

// List all interviews for a given user
export const ListByUser = query({
  args: {
    userId: v.string(),
  },
  async handler(ctx, args) {
    const interviews = await ctx.db
      .query("Interviews")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    return interviews;
  },
});

// Update the "name" of an interview (stored in jobDescription)
export const UpdateInterviewName = mutation({
  args: {
    interviewId: v.id("Interviews"),
    jobDescription: v.string(),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.interviewId, {
      jobDescription: args.jobDescription,
    });
  },
});

// Delete an interview
export const DeleteInterview = mutation({
  args: {
    interviewId: v.id("Interviews"),
  },
  async handler(ctx, args) {
    await ctx.db.delete(args.interviewId);
  },
});
