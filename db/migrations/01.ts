import { sql, type Kysely } from "kysely";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function up(db: Kysely<any>) {
  const setup = readFileSync(
    fileURLToPath(
      new URL("./setup.sql", import.meta.url),
    ),
    "utf8"
  );
  await sql.raw(setup).execute(db);
}

export async function down(db: Kysely<any>) {
  const cleanup = readFileSync(
    fileURLToPath(
      new URL("./cleanup.sql", import.meta.url),
    ),
    "utf8"
  );
  await sql.raw(cleanup).execute(db);
}
