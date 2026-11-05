import dotenv from "dotenv";
import { goldenSet } from "../src/lib/historical-data";
import { getSupabaseServerClient } from "../src/lib/supabase/server";

dotenv.config();

async function main() {
  const supabase = getSupabaseServerClient();
  const rows: Record<string, unknown>[] = [];

  // Muse (Meta Model API) does not expose an embeddings endpoint, so seed
  // rows are stored without a pgvector embedding. Archive retrieval uses
  // full-text search first, so this does not block matching.
  for (const event of goldenSet) {
    const structuralSkeleton = event.structuralSkeleton || event.description;

    const row: Record<string, any> = {
      title: event.title,
      year_label: event.year,
      archetype: event.archetype,
      description: event.description,
      structural_skeleton: structuralSkeleton,
      source: "Golden Set",
      metadata: {
        ingest_tier: "golden-set",
        seed: "golden-set",
        embedding_status: "missing",
      },
    };

    rows.push(row);
  }

  const { error } = await supabase
    .from("historical_events")
    .upsert(rows, { onConflict: "title,year_label,source" });

  if (error) {
    throw error;
  }

  console.log(
    JSON.stringify(
      {
        inserted: rows.length,
        embedded: 0,
        missingEmbeddings: rows.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
