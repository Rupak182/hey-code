import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("Session", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull(),
  title: text("title").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
  messages: text("messages", { mode: "json" }).$type<any[]>().notNull(),
});
