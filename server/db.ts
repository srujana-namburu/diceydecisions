import dotenv from "dotenv";
dotenv.config();

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Logger } from 'drizzle-orm';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a custom logger to log SQL queries
class CustomLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    console.log('SQL Query:', query);
    console.log('SQL Params:', params);
  }
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { 
  schema,
  logger: new CustomLogger()
});