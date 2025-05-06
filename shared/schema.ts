import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  email: true,
});

export const loginUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  ownerId: integer("owner_id").notNull(),
  maxParticipants: integer("max_participants"),
  allowParticipantsToAddOptions: boolean("allow_participants_to_add_options").notNull().default(true),
  isCompleted: boolean("is_completed").notNull().default(false),
  winningOptionId: integer("winning_option_id"),
  tiebreakerUsed: text("tiebreaker_used"),
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  title: true,
  description: true,
  maxParticipants: true,
  allowParticipantsToAddOptions: true,
});

export const options = pgTable("options", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdById: integer("created_by_id").notNull(),
});

export const insertOptionSchema = createInsertSchema(options).pick({
  roomId: true,
  text: true,
});

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: integer("user_id").notNull(),
  optionId: integer("option_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Option = typeof options.$inferSelect;
export type InsertOption = z.infer<typeof insertOptionSchema>;
export type Participant = typeof participants.$inferSelect;
export type Vote = typeof votes.$inferSelect;
