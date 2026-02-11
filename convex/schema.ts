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
    createdAt: v.number(),
  }),
});
