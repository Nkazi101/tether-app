import records from "../data/historical-canon.json";
import { validateCasePublication } from "./case-review";
export const CANON_EDITION = "source-canon-2026-11-04-1";
/** Agent-audited source cases. Not an independently historian-reviewed gold set. */
export const canonicalCases = records.map(record => validateCasePublication(record).historicalCase);
