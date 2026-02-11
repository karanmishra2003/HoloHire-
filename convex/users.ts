import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new user document in UserTable
export const createUser = mutation({
  args: {
    name: v.string(),
    imageUrl: v.string(),
    email: v.string(),
  },
  async handler(ctx, args) {
    // Check if a user with this email already exists
    const Users = await ctx.db
      .query("UserTable")
      .filter((q) => q.eq(q.field("email"), args.email))
      .collect();

    // If no user exists, insert a new one
    if (Users?.length==0) {
      const result = await ctx.db.insert("UserTable", {
        email: args.email,
        imageUrl: args.imageUrl,
        name: args.name,
      });

      return result;
    }

    // If user already exists, just return the existing record id
    return Users[0];
  },
});

