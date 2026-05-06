import { createPool } from 'mysql2'
import { FileMigrationProvider, Kysely, Migrator, MysqlDialect } from 'kysely'
import { env } from "../env";
import type { DB } from "kysely-codegen";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from 'node:url';

const dialect = new MysqlDialect({
  pool: createPool({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
    multipleStatements: true
  })
})

export const db = new Kysely<DB>({
  dialect
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(__dirname, "./migrations")
  })
})
