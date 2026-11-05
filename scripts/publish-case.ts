import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import { validateCasePublication } from "../server/domain/case-review";
import { getSupabaseServerClient } from "../src/lib/supabase/server";
dotenv.config({ path: ".env.local", override: true, quiet: true });
dotenv.config({ quiet: true });
const [mode, path] = process.argv.slice(2);
if (!["--validate", "--publish"].includes(mode) || !path)
  throw new Error(
    "Usage: npm run archive:case -- --validate|--publish /path/to/review.json",
  );
const review = validateCasePublication(
  JSON.parse(await readFile(path, "utf8")),
);
if (mode === "--publish") {
  const { error } = await getSupabaseServerClient()
    .from("tether_case_versions")
    .insert({
      case_id: review.historicalCase.id,
      version: review.historicalCase.version,
      payload: review,
      reviewed_by: review.reviewer,
      reviewed_at: review.reviewedAt,
    });
  if (error)
    throw new Error(
      error.code === "23505"
        ? "That case version already exists. Publish a new version instead of overwriting history."
        : "Case publication failed; verify the database migration and service credentials.",
    );
}
console.log(
  JSON.stringify({
    status: mode === "--publish" ? "published" : "valid",
    id: review.historicalCase.id,
    version: review.historicalCase.version,
    review: review.historicalCase.review,
  }),
);
