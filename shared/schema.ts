import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  zarBalance: decimal("zar_balance", { precision: 20, scale: 2 }).default("0.00").notNull(),
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
  timestamp: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
export type MarketData = typeof marketData.$inferSelect;
