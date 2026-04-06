import { migrator, db } from "./client.js";

const { error, results } = await migrator.migrateToLatest();

if (results?.length === 0) {
  console.log("Nothing to migrate, early exiting now");
  process.exit(0);
}

for (const it of results ?? []) {
  if (it.status === "Success") {
    console.log(`Migration "${it.migrationName}" ok`);
  } else if (it.status === "Error") {
    console.log(`Failed to execute migration "${it.migrationName}"`);
  }
}

if (error) {
  console.error(`Failed to migrate\n${error}`);
  process.exit(1);
}

console.log("Finalized migrations");

await db.destroy();
