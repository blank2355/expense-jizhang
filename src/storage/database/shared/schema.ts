import { pgTable, serial, varchar, timestamp, boolean, numeric, text, date, time, uuid, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 出差项目表
export const trips = pgTable(
	"trips",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		user_id: uuid("user_id").notNull().default(sql`auth.uid()`),
		name: varchar("name", { length: 128 }).notNull(),
		destination: varchar("destination", { length: 128 }),
		start_date: date("start_date").notNull(),
		end_date: date("end_date"),
		status: varchar("status", { length: 20 }).notNull().default("active"),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("trips_user_id_idx").on(table.user_id),
		index("trips_status_idx").on(table.status),
		index("trips_start_date_idx").on(table.start_date),
	]
);

// 记账记录表
export const records = pgTable(
	"records",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		user_id: uuid("user_id").notNull().default(sql`auth.uid()`),
		amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
		currency: varchar("currency", { length: 8 }).notNull().default("CNY"),
		category: varchar("category", { length: 32 }).notNull(),
		type: varchar("type", { length: 20 }).notNull().default("daily"),
		trip_id: uuid("trip_id").references(() => trips.id, { onDelete: "set null" }),
		merchant: varchar("merchant", { length: 128 }),
		payment_method: varchar("payment_method", { length: 32 }),
		note: text("note"),
		record_date: date("record_date").notNull(),
		record_time: time("record_time"),
		reimbursable: boolean("reimbursable").default(false).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("records_user_id_idx").on(table.user_id),
		index("records_category_idx").on(table.category),
		index("records_type_idx").on(table.type),
		index("records_trip_id_idx").on(table.trip_id),
		index("records_record_date_idx").on(table.record_date),
		index("records_user_date_idx").on(table.user_id, table.record_date),
	]
);
