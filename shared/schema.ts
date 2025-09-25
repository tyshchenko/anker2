import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").unique(),
  password_hash: text("password_hash"),
  first_name: text("first_name"),
  last_name: text("last_name"),
  google_id: text("google_id").unique(),
  profile_image_url: text("profile_image_url"),
  zarBalance: decimal("zar_balance", { precision: 20, scale: 2 }).default("0.00").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  session_token: text("session_token").notNull().unique(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type", { enum: ["buy", "sell", "convert"] }).notNull(),
  fromAsset: text("from_asset").notNull(),
  toAsset: text("to_asset").notNull(),
  fromAmount: decimal("from_amount", { precision: 20, scale: 8 }).notNull(),
  toAmount: decimal("to_amount", { precision: 20, scale: 8 }).notNull(),
  rate: decimal("rate", { precision: 20, scale: 8 }).notNull(),
  fee: decimal("fee", { precision: 20, scale: 8 }).notNull(),
  status: text("status", { enum: ["pending", "completed", "failed"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const marketData = pgTable("market_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pair: text("pair").notNull(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  change24h: decimal("change_24h", { precision: 10, scale: 4 }),
  volume24h: decimal("volume_24h", { precision: 20, scale: 8 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["email", "phone"] }).notNull(),
  code: text("code").notNull(),
  contact: text("contact").notNull(), // email address or phone number
  expires_at: timestamp("expires_at").notNull(),
  attempts: varchar("attempts").default("0").notNull(),
  verified: boolean("verified").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const verificationStatus = pgTable("verification_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  email_verified: boolean("email_verified").default(false).notNull(),
  email_address: text("email_address"),
  phone_verified: boolean("phone_verified").default(false).notNull(),
  phone_number: text("phone_number"),
  identity_status: text("identity_status", { enum: ["not_verified", "pending", "verified", "rejected"] }).default("not_verified").notNull(),
  identity_documents: text("identity_documents").array(),
  address_status: text("address_status", { enum: ["not_verified", "pending", "verified", "rejected"] }).default("not_verified").notNull(),
  address_documents: text("address_documents").array(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  email_notifications: boolean("email_notifications").default(true).notNull(),
  sms_notifications: boolean("sms_notifications").default(false).notNull(),
  trading_notifications: boolean("trading_notifications").default(true).notNull(),
  security_alerts: boolean("security_alerts").default(true).notNull(),
  two_factor_enabled: boolean("two_factor_enabled").default(false).notNull(),
  two_factor_secret: text("two_factor_secret"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password_hash: true,
  first_name: true,
  last_name: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
  timestamp: true,
});

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({
  id: true,
  created_at: true,
});

export const insertVerificationStatusSchema = createInsertSchema(verificationStatus).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
export type MarketData = typeof marketData.$inferSelect;
export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationStatus = z.infer<typeof insertVerificationStatusSchema>;
export type VerificationStatus = typeof verificationStatus.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
