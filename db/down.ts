import { migrator } from "./client.js";

const result = await migrator.migrateDown();
if (result.error) {
  console.error(result.error, `Migrate down error occurred`);
  process.exit(1);
} else {
  console.log(result.results, `Migrate down succeeded`);

  process.exit(0);
}
