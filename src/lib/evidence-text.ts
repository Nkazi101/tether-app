// Layout characters can be introduced by HTML line-breaking. They do not
// authorise fuzzy wording, omitted words or a change in punctuation inside a quote.
export const normaliseEvidenceText = (value: string) =>
  value
    .replace(/[\u00ad\u200b\u2060\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
export const normaliseEvidencePassage = (value: string) =>
  normaliseEvidenceText(value)
    .replace(/^["“«](.*)["”»]$/s, "$1")
    .trim();
