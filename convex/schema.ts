import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  UserTable: defineTable({
    name: v.string(),
    imageUrl: v.string(),
    email: v.string(),
  }),
  Interviews: defineTable({
    userId: v.string(),
    jobDescription: v.string(),
    resumeFileName: v.string(),
    resumeUrl: v.optional(v.string()),
    questions: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.number(),
  }),
});
