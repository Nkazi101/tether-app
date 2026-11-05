import { createHash } from "node:crypto";
import { createReadStream, statSync } from "node:fs";
import { spawn } from "node:child_process";
import { basename, extname, resolve } from "node:path";
import { createInterface } from "node:readline";
import type { Readable } from "node:stream";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local", override: true });
dotenv.config();

const HISTORICAL_REDUCED_URL =
  "https://data.gdeltproject.org/events/GDELT.MASTERREDUCEDV2.1979-2013.zip";
const DEFAULT_DATASET = "gdelt-1.0-reduced";
const DEFAULT_BATCH_SIZE = 1000;

const HISTORICAL_FIELDS = [
  "GLOBALEVENTID",
  "SQLDATE",
  "MonthYear",
  "Year",
  "FractionDate",
  "Actor1Code",
  "Actor1Name",
  "Actor1CountryCode",
  "Actor1KnownGroupCode",
  "Actor1EthnicCode",
  "Actor1Religion1Code",
  "Actor1Religion2Code",
  "Actor1Type1Code",
  "Actor1Type2Code",
  "Actor1Type3Code",
  "Actor2Code",
  "Actor2Name",
  "Actor2CountryCode",
  "Actor2KnownGroupCode",
  "Actor2EthnicCode",
  "Actor2Religion1Code",
  "Actor2Religion2Code",
  "Actor2Type1Code",
  "Actor2Type2Code",
  "Actor2Type3Code",
  "IsRootEvent",
  "EventCode",
  "EventBaseCode",
  "EventRootCode",
  "QuadClass",
  "GoldsteinScale",
  "NumMentions",
  "NumSources",
  "NumArticles",
  "AvgTone",
  "Actor1Geo_Type",
  "Actor1Geo_FullName",
  "Actor1Geo_CountryCode",
  "Actor1Geo_ADM1Code",
  "Actor1Geo_Lat",
  "Actor1Geo_Long",
  "Actor1Geo_FeatureID",
  "Actor2Geo_Type",
  "Actor2Geo_FullName",
  "Actor2Geo_CountryCode",
  "Actor2Geo_ADM1Code",
  "Actor2Geo_Lat",
  "Actor2Geo_Long",
  "Actor2Geo_FeatureID",
  "ActionGeo_Type",
  "ActionGeo_FullName",
  "ActionGeo_CountryCode",
  "ActionGeo_ADM1Code",
  "ActionGeo_Lat",
  "ActionGeo_Long",
  "ActionGeo_FeatureID",
  "DATEADDED",
];

type GdeltFormat = "reduced" | "historical" | "daily";

type ImportOptions = {
  mode: "census" | "import";
  filePath: string;
  dataset: string;
  sourceUrl: string;
  batchSize: number;
  maxRows: number | null;
  sampleEvery: number | null;
};

type GdeltRow = {
  dataset: string;
  global_event_id: number;
  source_file: string;
  snapshot_id?: string;
  event_date: string | null;
  date_added_key: string | null;
  actor1_code: string | null;
  actor1_name: string | null;
  actor1_country_code: string | null;
  actor1_type1_code: string | null;
  actor2_code: string | null;
  actor2_name: string | null;
  actor2_country_code: string | null;
  actor2_type1_code: string | null;
  event_code: string | null;
  event_base_code: string | null;
  event_root_code: string | null;
  quad_class: number | null;
  goldstein_scale: number | null;
  num_mentions: number | null;
  num_events: number | null;
  num_sources: number | null;
  num_articles: number | null;
  avg_tone: number | null;
  action_geo_name: string | null;
  action_geo_country_code: string | null;
  action_geo_lat: number | null;
  action_geo_long: number | null;
  source_url: string | null;
  metadata: Record<string, unknown>;
};

function parseArgs(argv: string[]): ImportOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) continue;
    const [key, inlineValue] = value.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      values.set(key, inlineValue);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      values.set(key, next);
      index += 1;
    } else {
      values.set(key, "true");
    }
  }

  const filePath = values.get("file");
  if (!filePath) {
    throw new Error(
      "Usage: tsx scripts/import-gdelt.ts --mode census|import --file /path/to/archive.zip [--max-rows N]"
    );
  }

  const mode = values.get("mode") === "import" ? "import" : "census";
  const batchSize = Math.max(
    100,
    Number.parseInt(
      values.get("batch-size") || process.env.GDELT_IMPORT_BATCH_SIZE || String(DEFAULT_BATCH_SIZE),
      10
    ) || DEFAULT_BATCH_SIZE
  );
  const parsedMaxRows = Number.parseInt(values.get("max-rows") || "", 10);
  const parsedSampleEvery = Number.parseInt(values.get("sample-every") || "", 10);

  return {
    mode,
    filePath: resolve(filePath),
    dataset: values.get("dataset") || DEFAULT_DATASET,
    sourceUrl: values.get("source-url") || HISTORICAL_REDUCED_URL,
    batchSize,
    maxRows: Number.isFinite(parsedMaxRows) && parsedMaxRows > 0 ? parsedMaxRows : null,
    sampleEvery:
      Number.isFinite(parsedSampleEvery) && parsedSampleEvery > 1 ? parsedSampleEvery : null,
  };
}

function cleanText(value: string | undefined) {
  const text = value?.trim() || "";
  return text ? text : null;
}

function parseNumber(value: string | undefined) {
  const number = Number.parseFloat(value || "");
  return Number.isFinite(number) ? number : null;
}

function parseInteger(value: string | undefined) {
  const number = Number.parseInt(value || "", 10);
  return Number.isFinite(number) ? number : null;
}

function parseDate(value: string | undefined) {
  const normalized = value?.trim() || "";
  if (!/^\d{8}$/.test(normalized) || normalized === "00000000") return null;
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
}

function parseRow(
  fields: string[],
  options: ImportOptions,
  lineNumber: number,
  format: GdeltFormat
): GdeltRow | null {
  if (format === "reduced") {
    if (fields.length < 17) return null;
    const eventCode = cleanText(fields[3]);
    return {
      dataset: options.dataset,
      global_event_id: lineNumber,
      source_file: basename(options.filePath),
      event_date: parseDate(fields[0]),
      date_added_key: null,
      actor1_code: cleanText(fields[1]),
      actor1_name: cleanText(fields[1]),
      actor1_country_code: cleanText(fields[1]),
      actor1_type1_code: null,
      actor2_code: cleanText(fields[2]),
      actor2_name: cleanText(fields[2]),
      actor2_country_code: cleanText(fields[2]),
      actor2_type1_code: null,
      event_code: eventCode,
      event_base_code: eventCode ? eventCode.slice(0, 3) : null,
      event_root_code: eventCode ? eventCode.slice(0, 2) : null,
      quad_class: parseInteger(fields[6]),
      goldstein_scale: parseNumber(fields[7]),
      num_mentions: null,
      num_events: parseInteger(fields[4]),
      num_sources: null,
      num_articles: parseInteger(fields[5]),
      avg_tone: null,
      action_geo_name: null,
      action_geo_country_code: null,
      action_geo_lat: parseNumber(fields[15]),
      action_geo_long: parseNumber(fields[16]),
      source_url: null,
      metadata: {
        source_line: lineNumber,
        source_format: "gdelt-1.0-reduced",
        source_geo_type: parseInteger(fields[8]),
        source_geo_lat: parseNumber(fields[9]),
        source_geo_long: parseNumber(fields[10]),
        target_geo_type: parseInteger(fields[11]),
        target_geo_lat: parseNumber(fields[12]),
        target_geo_long: parseNumber(fields[13]),
        action_geo_type: parseInteger(fields[14]),
      },
    };
  }

  if (fields.length < 57) return null;
  const globalEventId = parseInteger(fields[0]);
  if (globalEventId === null) return null;

  return {
    dataset: options.dataset,
    global_event_id: globalEventId,
    source_file: basename(options.filePath),
    event_date: parseDate(fields[1]),
    date_added_key: cleanText(fields[56]),
    actor1_code: cleanText(fields[5]),
    actor1_name: cleanText(fields[6]),
    actor1_country_code: cleanText(fields[7]),
    actor1_type1_code: cleanText(fields[12]),
    actor2_code: cleanText(fields[15]),
    actor2_name: cleanText(fields[16]),
    actor2_country_code: cleanText(fields[17]),
    actor2_type1_code: cleanText(fields[22]),
    event_code: cleanText(fields[26]),
    event_base_code: cleanText(fields[27]),
    event_root_code: cleanText(fields[28]),
    quad_class: parseInteger(fields[29]),
    goldstein_scale: parseNumber(fields[30]),
    num_mentions: parseInteger(fields[31]),
    num_events: null,
    num_sources: parseInteger(fields[32]),
    num_articles: parseInteger(fields[33]),
    avg_tone: parseNumber(fields[34]),
    action_geo_name: cleanText(fields[50]),
    action_geo_country_code: cleanText(fields[51]),
    action_geo_lat: parseNumber(fields[54]),
    action_geo_long: parseNumber(fields[55]),
    source_url: cleanText(fields[57]),
    metadata: {
      source_line: lineNumber,
      source_format: format === "daily" ? "gdelt-2.0-daily" : "gdelt-1.0-historical",
    },
  };
}

function openArchive(filePath: string) {
  if (extname(filePath).toLowerCase() !== ".zip") {
    return {
      stream: createReadStream(filePath) as Readable,
      close: Promise.resolve(),
    };
  }

  const child = spawn("unzip", ["-p", filePath], { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  const close = new Promise<void>((resolveClose, rejectClose) => {
    child.once("error", rejectClose);
    child.once("close", (code) => {
      if (code === 0) {
        resolveClose();
      } else {
        rejectClose(new Error(`unzip exited with code ${code}: ${stderr.trim()}`));
      }
    });
  });

  return { stream: child.stdout as Readable, close };
}

async function computeMd5(filePath: string) {
  const hash = createHash("md5");
  const stream = createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }
  return hash.digest("hex");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const stat = statSync(options.filePath);
  const sourceFile = basename(options.filePath);
  const md5 = options.mode === "import" ? await computeMd5(options.filePath) : null;
  const archive = openArchive(options.filePath);
  const lines = createInterface({ input: archive.stream, crlfDelay: Infinity });

  const eventRootCodes = new Set<string>();
  const actorCountries = new Set<string>();
  let lineNumber = 0;
  let rowCount = 0;
  let validRowCount = 0;
  let firstEventDate: string | null = null;
  let lastEventDate: string | null = null;
  let invalidRowCount = 0;
  let importedRowCount = 0;
  let selectedRowCount = 0;
  let batch: GdeltRow[] = [];
  let format: GdeltFormat | null = null;

  let supabase: any = null;
  let snapshotId: string | null = null;

  if (options.mode === "import") {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for import mode.");
    }

    supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("gdelt_snapshots")
      .upsert(
        {
          dataset: options.dataset,
          source_file: sourceFile,
          source_url: options.sourceUrl,
          source_md5: md5,
          status: "importing",
          compressed_bytes: stat.size,
          metadata: {
            importer: "scripts/import-gdelt.ts",
            mode: "import",
            max_rows: options.maxRows,
            sample_every: options.sampleEvery,
          },
        },
        { onConflict: "dataset,source_file" }
      )
      .select("id")
      .single();

    if (error) throw error;
    snapshotId = data.id;
  }

  for await (const rawLine of lines) {
    lineNumber += 1;
    const line = String(rawLine).replace(/\r$/, "");
    if (!line) continue;

    if (!format) {
      if (line.startsWith("Date\tSource\tTarget\tCAMEOCode\t")) {
        format = "reduced";
        continue;
      }
      if (line.startsWith("GLOBALEVENTID\t")) {
        format = line.split("\t").length >= 58 ? "daily" : "historical";
        continue;
      }

      const fieldCount = line.split("\t").length;
      format = fieldCount === 17 ? "reduced" : fieldCount >= 58 ? "daily" : "historical";
    }

    rowCount += 1;
    const row = parseRow(line.split("\t"), options, lineNumber, format);
    if (!row) {
      invalidRowCount += 1;
      continue;
    }

    validRowCount += 1;
    if (row.event_date && (!firstEventDate || row.event_date < firstEventDate)) firstEventDate = row.event_date;
    if (row.event_date && (!lastEventDate || row.event_date > lastEventDate)) lastEventDate = row.event_date;
    if (row.event_root_code) eventRootCodes.add(row.event_root_code);
    if (row.actor1_country_code) actorCountries.add(row.actor1_country_code);
    if (row.actor2_country_code) actorCountries.add(row.actor2_country_code);

    if (options.mode === "import" && supabase && snapshotId) {
      if (options.sampleEvery && row.global_event_id % options.sampleEvery !== 0) {
        if (options.maxRows && rowCount >= options.maxRows) break;
        continue;
      }

      selectedRowCount += 1;
      row.snapshot_id = snapshotId;
      batch.push(row);

      if (batch.length >= options.batchSize) {
        const { error } = await supabase
          .from("gdelt_event_index")
          .upsert(batch, { onConflict: "dataset,global_event_id" });
        if (error) throw error;
        importedRowCount += batch.length;
        batch = [];
        if (importedRowCount % 10000 === 0) {
          console.log(`Imported ${importedRowCount} rows...`);
        }
      }
    }

    if (options.maxRows && rowCount >= options.maxRows) break;
  }

  await archive.close;

  if (batch.length > 0 && supabase && snapshotId) {
    const { error } = await supabase
      .from("gdelt_event_index")
      .upsert(batch, { onConflict: "dataset,global_event_id" });
    if (error) throw error;
    importedRowCount += batch.length;
  }

  const report = {
    mode: options.mode,
    dataset: options.dataset,
    sourceFile,
    sourceUrl: options.sourceUrl,
    compressedBytes: stat.size,
    md5,
    rowCount,
    validRowCount,
    invalidRowCount,
    importedRowCount,
    selectedRowCount,
    format,
    firstEventDate,
    lastEventDate,
    eventRootCodes: [...eventRootCodes].sort(),
    actorCountryCount: actorCountries.size,
    truncated: Boolean(options.maxRows && rowCount >= options.maxRows),
  };

  if (supabase && snapshotId) {
    const { error } = await supabase
      .from("gdelt_snapshots")
      .update({
        status: "loaded",
        coverage_start: firstEventDate,
        coverage_end: lastEventDate,
        row_count: validRowCount,
        imported_row_count: importedRowCount,
        imported_at: new Date().toISOString(),
        metadata: report,
      })
      .eq("id", snapshotId);
    if (error) throw error;
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
