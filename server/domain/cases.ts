import {
  caseSchema,
  type HistoricalCase,
  type EvidenceSource,
} from "../../src/lib/comparison";

const checkedAt = "2026-11-03T05:00:00.000Z";
function reference(
  id: string,
  title: string,
  url: string,
  publisher: string,
  summary: string,
  publishedAt: string | null = null,
): EvidenceSource {
  return {
    id,
    title,
    url,
    publisher,
    summary,
    publishedAt,
    retrievedAt: checkedAt,
    kind: "historical-reference",
  };
}
export const energySources = [
  reference(
    "iea-gas-2022",
    "Gas Market Report, Q1 2023",
    "https://www.iea.org/reports/gas-market-report-q1-2023",
    "International Energy Agency",
    "Russia reduced pipeline gas deliveries to Europe in 2022. The supply shock raised prices and placed pressure on consumers beyond Europe.",
    "2023-02-28T00:00:00Z",
  ),
  reference(
    "eu-demand-2022",
    "Council adopts regulation on reducing gas demand",
    "https://www.consilium.europa.eu/en/press/press-releases/2022/08/05/council-adopts-regulation-on-reducing-gas-demand-by-15-this-winter/",
    "Council of the European Union",
    "EU countries agreed to a voluntary reduction in gas demand for winter 2022–23 to improve supply security and prepare for disruptions.",
    "2022-08-05T00:00:00Z",
  ),
  reference(
    "iea-demand-2022",
    "What drove the fall in European gas demand?",
    "https://www.iea.org/commentaries/europes-energy-crisis-what-factors-drove-the-record-fall-in-natural-gas-demand-in-2022",
    "International Energy Agency",
    "European gas demand fell in 2022. Weather, efficiency, fuel switching, changes in behavior and reduced industrial activity all contributed; reduced demand did not mean the disruption was costless.",
    "2023-03-14T00:00:00Z",
  ),
];
export const reviewedCases: HistoricalCase[] = [
  {
    id: "energy-europe-2022",
    version: "sources-2026-11-03-v2",
    title: "Europe’s gas-supply shock",
    period: "2022–2023",
    family: "supply",
    signals: ["supply-dependence", "supply-disruption"],
    initialState:
      "European consumers depended on pipeline gas imports when Russian deliveries were sharply reduced in 2022.",
    sequence: [
      {
        stage: "Dependence becomes a constraint",
        description: energySources[0].summary,
        sourceIds: ["iea-gas-2022"],
      },
      {
        stage: "Demand becomes part of the response",
        description: energySources[1].summary,
        sourceIds: ["eu-demand-2022"],
      },
      {
        stage: "Adaptation has several causes and costs",
        description: energySources[2].summary,
        sourceIds: ["iea-demand-2022"],
      },
    ],
    outcome:
      "Demand fell through several channels, including costly industrial reductions. The case shows adaptation without establishing that every gas shock resolves similarly.",
    boundaries: [
      "Pipeline gas, storage and replacement import capacity are specific constraints; an oil or shipping disruption can behave differently.",
      "Weather, available substitutes and the duration of lost supply must be established for the present event.",
    ],
    sources: energySources,
    review: "source-checked",
    reviewNote:
      "Source summaries checked against IEA reports and the EU Council decision on November 2, 2026. Causal transfer to another event remains an interpretation.",
    narrative: {
      title: "The quest for autonomy",
      interpretation:
        "A Jung-inspired Hero motif can frame the historical search for autonomy after a disruption reveals dependence. Buyers sought alternatives and authorities coordinated a response. The motif describes a possible story, not a psychological fact about the participants.",
      alternative:
        "A constraint-and-incentives account may explain the same behavior without archetypes. Demand can also fall because people and firms are harmed, rather than because substitution has solved the problem.",
      sourceIds: ["iea-gas-2022", "iea-demand-2022", "eu-demand-2022"],
    },
  },
  {
    id: "oil-embargo-1973",
    version: "sources-2026-11-03-v2",
    title: "The oil embargo and import dependence",
    period: "1973–1974",
    family: "supply",
    signals: ["supply-dependence", "supply-disruption"],
    initialState:
      "Oil-importing countries faced a deliberate embargo and production cuts amid conflict in the Middle East.",
    sources: [
      reference(
        "frus-oil-1973",
        "Oil Embargo, 1973–1974",
        "https://history.state.gov/milestones/1969-1976/oil-embargo",
        "US Office of the Historian",
        "Arab oil exporters imposed an embargo and production cuts. Import dependence and wider economic conditions contributed to the shock; diplomacy helped bring the embargo to an end in March 1974.",
      ),
      reference(
        "iea-history",
        "History of the IEA",
        "https://www.iea.org/about/mission/history-of-the-iea",
        "International Energy Agency",
        "The IEA was established after the 1973–74 crisis exposed oil-importing countries’ vulnerability to supply interruptions.",
      ),
    ],
    sequence: [
      {
        stage: "Supply becomes bargaining power",
        description:
          "An embargo and production cuts put importing countries under pressure.",
        sourceIds: ["frus-oil-1973"],
      },
      {
        stage: "Diplomacy and adaptation",
        description:
          "Negotiation contributed to the embargo ending, while vulnerability prompted longer-term changes.",
        sourceIds: ["frus-oil-1973"],
      },
      {
        stage: "A coordinated institutional response",
        description: "The crisis led importing countries to establish the IEA.",
        sourceIds: ["iea-history"],
      },
    ],
    outcome:
      "The embargo ended in March 1974, while energy security institutions and policies continued to change.",
    boundaries: [
      "This was a deliberate oil embargo, not every form of physical supply disruption.",
      "The monetary system, available spare capacity and importing economies differed from today.",
    ],
    review: "source-checked",
    reviewNote:
      "Source summaries checked against the Office of the Historian and IEA history on November 2, 2026; the sources have institutional perspectives.",
    narrative: {
      title: "The quest for autonomy",
      interpretation:
        "A Jung-inspired Hero motif frames importing countries’ search for autonomy when a supplier’s leverage reveals their dependence. Coordination becomes part of the historical response. Applying this lens does not establish virtuous heroes, villains or hidden motives.",
      alternative:
        "Ordinary incentives and institutional coordination may explain the response without archetypes. Broader economic conditions can amplify prices even when the immediate supply dispute changes.",
      sourceIds: ["frus-oil-1973", "iea-history"],
    },
  },
  {
    id: "flint-1937",
    version: "reference-2026-11-02",
    title: "The Flint sit-down strike",
    period: "1936–1937",
    family: "labor",
    signals: ["collective-bargaining", "work-stoppage"],
    initialState:
      "General Motors workers occupied plants during a dispute about workplace conditions and union recognition.",
    sequence: [
      {
        stage: "Workers occupy production sites",
        description:
          "Workers remained inside plants during the strike, limiting replacement production.",
        sourceIds: ["loc-flint"],
      },
      {
        stage: "An agreement follows",
        description:
          "The dispute ended with an agreement between General Motors and the UAW in February 1937.",
        sourceIds: ["loc-flint"],
      },
    ],
    outcome:
      "The agreement advanced UAW recognition. This case does not establish a general probability of successful collective action.",
    boundaries: [
      "The ability to occupy critical production sites, labor law and political conditions were specific to this dispute.",
      "A military strike, an EU meeting or an ordinary wage announcement does not establish collective bargaining or a work stoppage.",
    ],
    sources: [
      reference(
        "loc-flint",
        "The Flint, Michigan, Sit-Down Strike",
        "https://guides.loc.gov/this-month-in-business-history/february/flint-michigan-sit-down-strike",
        "Library of Congress",
        "Workers occupied General Motors plants in Flint during the 1936–37 labor dispute. An agreement with the UAW followed in February 1937.",
      ),
    ],
    review: "reference-only",
    reviewNote:
      "A useful reference lead; further independent evidence is needed for a fully supported comparison.",
    narrative: null,
  },
  {
    id: "microsoft-antitrust-2002",
    version: "reference-2026-11-02",
    title: "The Microsoft antitrust case",
    period: "1998–2002",
    family: "regulation",
    signals: ["gatekeeper-control", "enforcement-action"],
    initialState:
      "US antitrust enforcement challenged Microsoft’s conduct involving operating systems, browsers and middleware.",
    sequence: [
      {
        stage: "Enforcement challenges a gatekeeper",
        description:
          "The litigation addressed Microsoft’s conduct involving browsers and middleware.",
        sourceIds: ["doj-microsoft"],
      },
      {
        stage: "A remedial judgment",
        description: "A final judgment was entered in November 2002.",
        sourceIds: ["doj-microsoft"],
      },
    ],
    outcome:
      "The final judgment imposed remedies. It does not mean that all platform disputes end in a breakup or the same remedy.",
    boundaries: [
      "Legal jurisdiction, market definition, remedies sought and procedural stage matter.",
      "Abandoning a case reverses enforcement; it should not be presented as another crackdown.",
    ],
    sources: [
      reference(
        "doj-microsoft",
        "US v. Microsoft: Browser and Middleware",
        "https://www.justice.gov/atr/case/us-v-microsoft-corporation-browser-and-middleware",
        "US Department of Justice",
        "The case archive contains the final judgment entered in November 2002 and documents concerning antitrust remedies.",
      ),
    ],
    review: "reference-only",
    reviewNote:
      "Official case documents provide a starting point. Independent review is still required for broader causal claims.",
    narrative: null,
  },
].map((value) => caseSchema.parse(value));
