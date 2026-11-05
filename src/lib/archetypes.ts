export type DomainSlug =
  | "geopolitics"
  | "business"
  | "sports"
  | "entertainment"
  | "culture"
  | "lifestyle"
  | "technology"
  | "science"
  | "general";

export type EventTypeSlug =
  | "strategic-competition"
  | "regulatory-crackdown"
  | "labor-dispute"
  | "platform-transition"
  | "leadership-change"
  | "dynastic-rise-or-decline"
  | "distribution-shift"
  | "scandal-cycle"
  | "cultural-revival"
  | "consumer-trend-swing"
  | "resource-shock"
  | "legitimacy-crisis";

export type MechanismSlug =
  | "power-transition"
  | "elite-fragmentation"
  | "legitimacy-erosion"
  | "regulatory-backlash"
  | "gatekeeper-collapse"
  | "platform-disintermediation"
  | "labor-realignment"
  | "scarcity-shock"
  | "network-fragility"
  | "speculative-excess"
  | "reputation-contagion"
  | "rivalry-escalation"
  | "institutional-hardening"
  | "audience-fragmentation"
  | "distribution-rebundling"
  | "nostalgia-revival"
  | "commercialization-wave"
  | "monopoly-consolidation"
  | "frontier-privatization"
  | "rules-reset";

export type PersonaArchetypeSlug =
  | "threatened-king"
  | "anointed-outsider"
  | "exile-strategist"
  | "reluctant-messenger"
  | "court-insider"
  | "wise-builder"
  | "betrayer-within"
  | "restorer";

export type StructuralRole =
  | "incumbent"
  | "challenger"
  | "broker"
  | "insider"
  | "outsider"
  | "witness";

export interface EventArchetypeDefinition {
  publicLabel: string;
  plainEnglishMeaning: string;
}

export interface PersonaArchetypeDefinition {
  publicLabel: string;
  biblicalInspiration: string;
  coreDrive: string;
  stressBehavior: string;
  commonTactic: string;
  likelyDownfall: string;
}

export interface ActorArchetypeSummary {
  actor: string;
  derivedFrom: "actor-role" | "pattern-default";
  structuralRole: StructuralRole;
  structuralRoleLabel: string;
  personaArchetype: PersonaArchetypeSlug;
  personaLabel: string;
  biblicalInspiration: string;
  coreDrive: string;
  stressBehavior: string;
  commonTactic: string;
  likelyDownfall: string;
  playOut: string;
}

export const domainLabels = {
  geopolitics: "World Affairs",
  business: "Business",
  sports: "Sports",
  entertainment: "Entertainment",
  culture: "Culture",
  lifestyle: "Everyday Life",
  technology: "Tech",
  science: "Science",
  general: "General",
} satisfies Record<DomainSlug, string>;

export const eventArchetypes = {
  "strategic-competition": {
    publicLabel: "Big Power Showdown",
    plainEnglishMeaning:
      "Two strong players see each other as a real threat, and the fight keeps growing.",
  },
  "regulatory-crackdown": {
    publicLabel: "The Giant Gets Checked",
    plainEnglishMeaning:
      "A company, leader, or system gets so powerful that someone steps in to slow it down.",
  },
  "labor-dispute": {
    publicLabel: "Workers Push Back",
    plainEnglishMeaning:
      "People doing the work decide the deal is no longer fair and start using their leverage.",
  },
  "platform-transition": {
    publicLabel: "The Ground Shifts",
    plainEnglishMeaning:
      "A new technology or platform changes the rules faster than the old system can adapt.",
  },
  "leadership-change": {
    publicLabel: "New Boss, New Rules",
    plainEnglishMeaning:
      "A change at the top reshapes incentives, expectations, and the mood of the whole system.",
  },
  "dynastic-rise-or-decline": {
    publicLabel: "Rise or Fall of a Dynasty",
    plainEnglishMeaning:
      "A long-dominant force keeps winning, starts slipping, or gets replaced by a sharper rival.",
  },
  "distribution-shift": {
    publicLabel: "Control of the Audience Changes Hands",
    plainEnglishMeaning:
      "The path to customers, fans, or voters moves to a new gatekeeper.",
  },
  "scandal-cycle": {
    publicLabel: "Scandal and Blowback",
    plainEnglishMeaning:
      "A public mistake turns into a larger wave of punishment, panic, and overreaction.",
  },
  "cultural-revival": {
    publicLabel: "The Old Thing Comes Back",
    plainEnglishMeaning:
      "A style, symbol, or idea returns because it suddenly means something new again.",
  },
  "consumer-trend-swing": {
    publicLabel: "Everyone Wants It, Then They Don't",
    plainEnglishMeaning:
      "Tastes change fast, the crowd moves with the mood, and yesterday's winner fades quickly.",
  },
  "resource-shock": {
    publicLabel: "The Supply Squeeze",
    plainEnglishMeaning:
      "A key input becomes scarce, expensive, or politically dangerous and the whole system feels it.",
  },
  "legitimacy-crisis": {
    publicLabel: "People Stop Believing the System",
    plainEnglishMeaning:
      "The public stops trusting the people in charge, and the old story stops working.",
  },
} satisfies Record<EventTypeSlug, EventArchetypeDefinition>;

const legacyEventTypeMap = {
  "Thucydides Trap": "strategic-competition",
  Brinkmanship: "strategic-competition",
  "Declining Imperial Leverage": "strategic-competition",
  "Trade Rivalry Cycle": "strategic-competition",
  "Innovation Prestige Shock": "strategic-competition",
  "Imperial Overstretch": "legitimacy-crisis",
  "Populist Uprising": "legitimacy-crisis",
  "Legitimacy Collapse": "legitimacy-crisis",
  "Technological Paradigm Shift": "platform-transition",
  "Knowledge Platform Race": "platform-transition",
  "Monopoly Backlash": "regulatory-crackdown",
  "Gatekeeper Reset": "regulatory-crackdown",
  "Network Regulation": "regulatory-crackdown",
  "Frontier Rules Reset": "regulatory-crackdown",
  "Studio System Reset": "distribution-shift",
  "Digital Disintermediation": "distribution-shift",
  "Media Rights Rebundle": "distribution-shift",
  "Backlash Spiral": "scandal-cycle",
  "Player Power Reset": "labor-dispute",
  "Revenue Sharing Conflict": "labor-dispute",
  "Talent Mobility Shock": "labor-dispute",
  "Commodity Shock": "resource-shock",
  "Nostalgia Revival": "cultural-revival",
  "Wellness Commercialization": "consumer-trend-swing",
  "Diet Trend Cycle": "consumer-trend-swing",
} satisfies Record<string, EventTypeSlug>;

export const mechanismLabels = {
  "power-transition": "A Rising Challenger",
  "elite-fragmentation": "The Inner Circle Splits",
  "legitimacy-erosion": "Trust Drains Away",
  "regulatory-backlash": "The System Pushes Back",
  "gatekeeper-collapse": "Gatekeepers Lose Their Grip",
  "platform-disintermediation": "New Platform, New Rules",
  "labor-realignment": "Workers Gain Leverage",
  "scarcity-shock": "Scarcity Hits Hard",
  "network-fragility": "One Broken Link Shakes Everything",
  "speculative-excess": "Hype Outruns Reality",
  "reputation-contagion": "Outrage Spreads Fast",
  "rivalry-escalation": "Tit-for-Tat Spiral",
  "institutional-hardening": "Institutions Dig In",
  "audience-fragmentation": "The Crowd Splits Up",
  "distribution-rebundling": "The Bundle Comes Back",
  "nostalgia-revival": "The Past Feels Useful Again",
  "commercialization-wave": "Everything Gets Monetized",
  "monopoly-consolidation": "Power Piles Up at the Top",
  "frontier-privatization": "Private Money Moves Into the Frontier",
  "rules-reset": "The Rules Get Rewritten",
} satisfies Record<MechanismSlug, string>;

export const structuralRoleLabels = {
  incumbent: "Already in charge",
  challenger: "Trying to take the spot",
  broker: "Cuts deals between sides",
  insider: "Inside the room, but not at the top",
  outsider: "Pushing in from outside",
  witness: "Helps the public see clearly",
} satisfies Record<StructuralRole, string>;

export const personaArchetypes = {
  "threatened-king": {
    publicLabel: "The Leader Who Feels the Ground Moving",
    biblicalInspiration: "Saul",
    coreDrive: "Stay in control.",
    stressBehavior: "Tightens control, trusts fewer people, and punishes disloyalty.",
    commonTactic: "Uses the system to protect the system.",
    likelyDownfall: "Speeds up the very loss of trust they fear.",
  },
  "anointed-outsider": {
    publicLabel: "The Underdog on the Rise",
    biblicalInspiration: "David",
    coreDrive: "Prove they belong at the top.",
    stressBehavior: "Gets bolder, more symbolic, and more direct.",
    commonTactic: "Turns contrast into momentum.",
    likelyDownfall: "Wins power, then starts acting like the old guard.",
  },
  "exile-strategist": {
    publicLabel: "The Outsider Who Knows How to Survive",
    biblicalInspiration: "Joseph",
    coreDrive: "Survive, adapt, and quietly gain leverage.",
    stressBehavior: "Thinks ahead, centralizes decisions, and plays the long game.",
    commonTactic: "Solves the crisis better than the insiders.",
    likelyDownfall: "Saves the system, but makes it more dependent on the center.",
  },
  "reluctant-messenger": {
    publicLabel: "The One Who Says What Others Won't",
    biblicalInspiration: "Moses or Jonah",
    coreDrive: "Tell the truth even when it costs them.",
    stressBehavior: "Hesitates at first, then becomes clearer and firmer.",
    commonTactic: "Names the problem nobody wants to say out loud.",
    likelyDownfall: "Gets isolated, ignored, or used more as a symbol than a leader.",
  },
  "court-insider": {
    publicLabel: "The Person Inside the Room",
    biblicalInspiration: "Esther or Daniel",
    coreDrive: "Shape outcomes from the inside.",
    stressBehavior: "Stays careful, patient, and strategic.",
    commonTactic: "Uses timing, access, and quiet persuasion.",
    likelyDownfall: "Gets trapped by loyalty, silence, or proximity to power.",
  },
  "wise-builder": {
    publicLabel: "The Builder of the New Order",
    biblicalInspiration: "Solomon",
    coreDrive: "Build something lasting, orderly, and impressive.",
    stressBehavior: "Over-designs, over-centralizes, and trusts their own brilliance too much.",
    commonTactic: "Builds systems that make everyone else play by new rules.",
    likelyDownfall: "Creates something strong that later turns brittle.",
  },
  "betrayer-within": {
    publicLabel: "The Insider Who Breaks Ranks",
    biblicalInspiration: "Judas",
    coreDrive: "Act on private grievance, disillusionment, or self-interest.",
    stressBehavior: "Defects at the worst possible moment for the group.",
    commonTactic: "Uses trust and access as leverage.",
    likelyDownfall: "Becomes the face of a fracture that was already there.",
  },
  restorer: {
    publicLabel: "The One Who Puts Things Back Together",
    biblicalInspiration: "Nehemiah and post-exile rebuilders",
    coreDrive: "Rebuild after failure or drift.",
    stressBehavior: "Gets disciplined, practical, and unsentimental.",
    commonTactic: "Focuses on repair, boundaries, and durable order.",
    likelyDownfall: "Rebuilds stability but leaves little room for experimentation or mercy.",
  },
} satisfies Record<PersonaArchetypeSlug, PersonaArchetypeDefinition>;

export function getPublicDomainLabel(value?: string | null) {
  if (!value) return null;
  return domainLabels[value as DomainSlug] || humanizeLabel(value);
}

export function getPublicEventTypeLabel(value?: string | null) {
  const eventTypeSlug = resolveEventTypeSlug(value);
  if (!eventTypeSlug) {
    return value ? humanizeLabel(value) : null;
  }

  return eventArchetypes[eventTypeSlug].publicLabel;
}

export function getPublicEventTypeMeaning(value?: string | null) {
  const eventTypeSlug = resolveEventTypeSlug(value);
  return eventTypeSlug ? eventArchetypes[eventTypeSlug].plainEnglishMeaning : null;
}

export function getPublicMechanismLabel(value?: string | null) {
  if (!value) return null;
  return mechanismLabels[value as MechanismSlug] || humanizeLabel(value);
}

export function getPublicPersonaLabel(value?: string | null) {
  if (!value) return null;
  return personaArchetypes[value as PersonaArchetypeSlug]?.publicLabel || humanizeLabel(value);
}

export function getPublicSignalLabel(value?: string | null) {
  if (!value) return null;

  const eventTypeSlug = resolveEventTypeSlug(value);
  if (eventTypeSlug) {
    return eventArchetypes[eventTypeSlug].publicLabel;
  }

  return (
    mechanismLabels[value as MechanismSlug] ||
    domainLabels[value as DomainSlug] ||
    humanizeLabel(value)
  );
}

export function getPublicStructuralRoleLabel(value: StructuralRole) {
  return structuralRoleLabels[value];
}

export function resolveEventTypeSlug(value?: string | null): EventTypeSlug | null {
  if (!value) return null;

  if (value in eventArchetypes) {
    return value as EventTypeSlug;
  }

  const normalized = normalizeLookup(value);
  const eventTypeEntry = Object.entries(eventArchetypes).find(
    ([slug, definition]) =>
      normalizeLookup(slug) === normalized || normalizeLookup(definition.publicLabel) === normalized
  );
  if (eventTypeEntry) {
    return eventTypeEntry[0] as EventTypeSlug;
  }

  const legacyEntry = Object.entries(legacyEventTypeMap).find(
    ([legacyLabel]) => normalizeLookup(legacyLabel) === normalized
  );
  return legacyEntry ? legacyEntry[1] : null;
}

export function buildActorArchetypeSummary(params: {
  actor: string;
  eventTypeSlug?: EventTypeSlug | null;
  derivedFrom?: "actor-role" | "pattern-default";
  fallbackIndex?: number;
  structuralRole?: StructuralRole;
}): ActorArchetypeSummary {
  const actor = normalizeActorLabel(params.actor);
  const eventTypeSlug = params.eventTypeSlug || null;
  const structuralRole =
    params.structuralRole || inferStructuralRoleFromActor(actor, eventTypeSlug, params.fallbackIndex || 0);
  const personaArchetype = inferPersonaArchetype(structuralRole, eventTypeSlug);
  const persona = personaArchetypes[personaArchetype];

  return {
    actor,
    derivedFrom: params.derivedFrom || "actor-role",
    structuralRole,
    structuralRoleLabel: structuralRoleLabels[structuralRole],
    personaArchetype,
    personaLabel: persona.publicLabel,
    biblicalInspiration: persona.biblicalInspiration,
    coreDrive: persona.coreDrive,
    stressBehavior: persona.stressBehavior,
    commonTactic: persona.commonTactic,
    likelyDownfall: persona.likelyDownfall,
    playOut: buildPersonaPlayOut(personaArchetype, eventTypeSlug),
  };
}

export function buildPatternDefaultActors(
  eventTypeSlug?: EventTypeSlug | null
): ActorArchetypeSummary[] {
  const cast = getDefaultPatternCast(eventTypeSlug);
  return cast.map((entry, index) =>
    buildActorArchetypeSummary({
      actor: entry.actor,
      eventTypeSlug,
      derivedFrom: "pattern-default",
      fallbackIndex: index,
      structuralRole: entry.structuralRole,
    })
  );
}

export function isUsableActorLabel(value: string) {
  const normalized = normalizeActorLabel(value).toLowerCase();
  if (!normalized) return false;
  return !/\b(resource|commodity|capital|infrastructure|raw material|market sentiment)\b/.test(
    normalized
  );
}

export function humanizeLabel(value: string) {
  const normalized = value.trim();
  if (!normalized) return normalized;

  if (/[-_]/.test(normalized)) {
    return normalized
      .split(/[-_]+/)
      .filter(Boolean)
      .map(toTitleCase)
      .join(" ");
  }

  if (normalized === normalized.toLowerCase()) {
    return normalized
      .split(/\s+/)
      .filter(Boolean)
      .map(toTitleCase)
      .join(" ");
  }

  return normalized;
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeLookup(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeActorLabel(value: string) {
  return value.replace(/^\[|\]$/g, "").replace(/\s+/g, " ").trim();
}

function inferStructuralRoleFromActor(
  actor: string,
  eventTypeSlug?: EventTypeSlug | null,
  fallbackIndex = 0
): StructuralRole {
  const normalized = normalizeLookup(actor);

  if (
    /\b(journalist|critic|commentator|public|voters?|citizens?|consumers?|fans?|whistleblower|watchdog|observer|analyst|victim|witness|press|media)\b/.test(
      normalized
    )
  ) {
    return "witness";
  }

  if (
    /\b(regulator|court|judge|mediator|broker|negotiator|diplomat|referee|committee|commission|moderator)\b/.test(
      normalized
    )
  ) {
    return "broker";
  }

  if (
    /\b(challenger|rival|opposition|rebel|insurgent|protester|movement|union|workers?|players?|entrant|startup|newcomer|competitor|reformer|upstart)\b/.test(
      normalized
    )
  ) {
    return "challenger";
  }

  if (
    /\b(insider|advisor|cabinet|minister|staff|strategist|courtier|operative|scientist|researcher|engineer|chief of staff)\b/.test(
      normalized
    )
  ) {
    return "insider";
  }

  if (
    /\b(outsider|exile|diaspora|supplier|producer|investor|contractor|private actor|founder)\b/.test(
      normalized
    )
  ) {
    return "outsider";
  }

  if (
    /\b(hegemon|incumbent|government|administration|regime|leader|leadership|ruler|monarch|king|owner|owners|management|board|company|platform|publisher|studio|empire|state|league|establishment|champion)\b/.test(
      normalized
    )
  ) {
    return "incumbent";
  }

  const fallbackOrder = getFallbackRoleOrder(eventTypeSlug);
  return fallbackOrder[fallbackIndex % fallbackOrder.length];
}

function inferPersonaArchetype(
  structuralRole: StructuralRole,
  eventTypeSlug?: EventTypeSlug | null
): PersonaArchetypeSlug {
  if (!eventTypeSlug) {
    return getGenericPersonaForRole(structuralRole);
  }

  switch (eventTypeSlug) {
    case "strategic-competition":
      return mapPersonaByRole(structuralRole, {
        incumbent: "threatened-king",
        challenger: "anointed-outsider",
        broker: "court-insider",
        insider: "exile-strategist",
        outsider: "exile-strategist",
        witness: "reluctant-messenger",
      });
    case "regulatory-crackdown":
      return mapPersonaByRole(structuralRole, {
        incumbent: "wise-builder",
        challenger: "anointed-outsider",
        broker: "restorer",
        insider: "court-insider",
        outsider: "exile-strategist",
        witness: "reluctant-messenger",
      });
    case "labor-dispute":
      return mapPersonaByRole(structuralRole, {
        incumbent: "threatened-king",
        challenger: "anointed-outsider",
        broker: "restorer",
        insider: "betrayer-within",
        outsider: "exile-strategist",
        witness: "reluctant-messenger",
      });
    case "platform-transition":
      return mapPersonaByRole(structuralRole, {
        incumbent: "threatened-king",
        challenger: "wise-builder",
        broker: "restorer",
        insider: "court-insider",
        outsider: "exile-strategist",
        witness: "reluctant-messenger",
      });
    case "leadership-change":
      return mapPersonaByRole(structuralRole, {
        incumbent: "threatened-king",
        challenger: "anointed-outsider",
        broker: "restorer",
        insider: "court-insider",
        outsider: "exile-strategist",
        witness: "reluctant-messenger",
      });
    case "dynastic-rise-or-decline":
      return mapPersonaByRole(structuralRole, {
        incumbent: "threatened-king",
        challenger: "anointed-outsider",
        broker: "restorer",
        insider: "wise-builder",
        outsider: "exile-strategist",
        witness: "reluctant-messenger",
      });
    case "distribution-shift":
      return mapPersonaByRole(structuralRole, {
        incumbent: "threatened-king",
        challenger: "wise-builder",
        broker: "restorer",
        insider: "betrayer-within",
        outsider: "exile-strategist",
        witness: "reluctant-messenger",
      });
    case "scandal-cycle":
      return mapPersonaByRole(structuralRole, {
        incumbent: "threatened-king",
        challenger: "anointed-outsider",
        broker: "court-insider",
        insider: "betrayer-within",
        outsider: "exile-strategist",
        witness: "reluctant-messenger",
      });
    case "cultural-revival":
      return mapPersonaByRole(structuralRole, {
        incumbent: "wise-builder",
        challenger: "anointed-outsider",
        broker: "court-insider",
        insider: "court-insider",
        outsider: "exile-strategist",
        witness: "reluctant-messenger",
      });
    case "consumer-trend-swing":
      return mapPersonaByRole(structuralRole, {
        incumbent: "wise-builder",
        challenger: "anointed-outsider",
        broker: "restorer",
        insider: "court-insider",
        outsider: "exile-strategist",
        witness: "reluctant-messenger",
      });
    case "resource-shock":
      return mapPersonaByRole(structuralRole, {
        incumbent: "threatened-king",
        challenger: "anointed-outsider",
        broker: "restorer",
        insider: "court-insider",
        outsider: "exile-strategist",
        witness: "reluctant-messenger",
      });
    case "legitimacy-crisis":
      return mapPersonaByRole(structuralRole, {
        incumbent: "threatened-king",
        challenger: "anointed-outsider",
        broker: "restorer",
        insider: "betrayer-within",
        outsider: "exile-strategist",
        witness: "reluctant-messenger",
      });
    default:
      return getGenericPersonaForRole(structuralRole);
  }
}

function getGenericPersonaForRole(structuralRole: StructuralRole): PersonaArchetypeSlug {
  switch (structuralRole) {
    case "incumbent":
      return "threatened-king";
    case "challenger":
      return "anointed-outsider";
    case "broker":
      return "restorer";
    case "insider":
      return "court-insider";
    case "outsider":
      return "exile-strategist";
    case "witness":
      return "reluctant-messenger";
    default:
      return "reluctant-messenger";
  }
}

function getFallbackRoleOrder(eventTypeSlug?: EventTypeSlug | null): StructuralRole[] {
  switch (eventTypeSlug) {
    case "scandal-cycle":
      return ["incumbent", "insider", "witness"];
    case "strategic-competition":
    case "leadership-change":
    case "dynastic-rise-or-decline":
    case "legitimacy-crisis":
      return ["incumbent", "challenger", "witness"];
    case "resource-shock":
      return ["incumbent", "outsider", "broker"];
    default:
      return ["incumbent", "challenger", "broker"];
  }
}

function getDefaultPatternCast(eventTypeSlug?: EventTypeSlug | null) {
  switch (eventTypeSlug) {
    case "strategic-competition":
      return [
        { actor: "Established power", structuralRole: "incumbent" as const },
        { actor: "Rising challenger", structuralRole: "challenger" as const },
        { actor: "Back-channel insider", structuralRole: "broker" as const },
      ];
    case "regulatory-crackdown":
      return [
        { actor: "Dominant player", structuralRole: "incumbent" as const },
        { actor: "Rule enforcer", structuralRole: "broker" as const },
        { actor: "Restless outsider", structuralRole: "challenger" as const },
      ];
    case "labor-dispute":
      return [
        { actor: "Management", structuralRole: "incumbent" as const },
        { actor: "Workers or players", structuralRole: "challenger" as const },
        { actor: "Mediator", structuralRole: "broker" as const },
      ];
    case "platform-transition":
      return [
        { actor: "Old guard", structuralRole: "incumbent" as const },
        { actor: "New builder", structuralRole: "challenger" as const },
        { actor: "Bridge figure", structuralRole: "broker" as const },
      ];
    case "leadership-change":
      return [
        { actor: "Outgoing leadership", structuralRole: "incumbent" as const },
        { actor: "Incoming leader", structuralRole: "challenger" as const },
        { actor: "Inner-circle strategist", structuralRole: "insider" as const },
      ];
    case "dynastic-rise-or-decline":
      return [
        { actor: "Fading power", structuralRole: "incumbent" as const },
        { actor: "Rising rival", structuralRole: "challenger" as const },
        { actor: "System builder", structuralRole: "insider" as const },
      ];
    case "distribution-shift":
      return [
        { actor: "Old gatekeeper", structuralRole: "incumbent" as const },
        { actor: "New platform", structuralRole: "challenger" as const },
        { actor: "Inside defector", structuralRole: "insider" as const },
      ];
    case "scandal-cycle":
      return [
        { actor: "Embattled leader", structuralRole: "incumbent" as const },
        { actor: "Insider with information", structuralRole: "insider" as const },
        { actor: "Public truth teller", structuralRole: "witness" as const },
      ];
    case "cultural-revival":
      return [
        { actor: "Taste gatekeeper", structuralRole: "incumbent" as const },
        { actor: "Trend maker", structuralRole: "challenger" as const },
        { actor: "Cultural interpreter", structuralRole: "witness" as const },
      ];
    case "consumer-trend-swing":
      return [
        { actor: "Category leader", structuralRole: "incumbent" as const },
        { actor: "Hot new entrant", structuralRole: "challenger" as const },
        { actor: "Public taste setter", structuralRole: "witness" as const },
      ];
    case "resource-shock":
      return [
        { actor: "System manager", structuralRole: "incumbent" as const },
        { actor: "Critical supplier", structuralRole: "outsider" as const },
        { actor: "Emergency fixer", structuralRole: "broker" as const },
      ];
    case "legitimacy-crisis":
      return [
        { actor: "Current leadership", structuralRole: "incumbent" as const },
        { actor: "Rising opposition", structuralRole: "challenger" as const },
        { actor: "Truth teller", structuralRole: "witness" as const },
      ];
    default:
      return [
        { actor: "Current leadership", structuralRole: "incumbent" as const },
        { actor: "Rising challenger", structuralRole: "challenger" as const },
        { actor: "Bridge figure", structuralRole: "broker" as const },
      ];
  }
}

function mapPersonaByRole(
  structuralRole: StructuralRole,
  mapping: Record<StructuralRole, PersonaArchetypeSlug>
) {
  return mapping[structuralRole];
}

function buildPersonaPlayOut(
  personaArchetype: PersonaArchetypeSlug,
  eventTypeSlug?: EventTypeSlug | null
) {
  const eventLabel = (getPublicEventTypeLabel(eventTypeSlug) || "this kind of story").toLowerCase();

  switch (personaArchetype) {
    case "threatened-king":
      return `In ${eventLabel}, this actor usually tightens control, narrows the circle, and mistakes fear for loyalty.`;
    case "anointed-outsider":
      return `In ${eventLabel}, this actor usually gains ground by making the old order look tired, timid, or out of touch.`;
    case "exile-strategist":
      return `In ${eventLabel}, this actor usually wins by reading the system clearly and solving what insiders cannot.`;
    case "reluctant-messenger":
      return `In ${eventLabel}, this actor usually matters because they say the thing everyone else is trying not to say.`;
    case "court-insider":
      return `In ${eventLabel}, this actor usually shapes the turning point through timing, access, and quiet pressure from inside the room.`;
    case "wise-builder":
      return `In ${eventLabel}, this actor usually remakes the field quickly, then invites backlash once others see how much power has moved.`;
    case "betrayer-within":
      return `In ${eventLabel}, this actor usually reveals the fracture by breaking ranks when the coalition is weakest.`;
    case "restorer":
      return `In ${eventLabel}, this actor usually wins trust by promising repair, guardrails, and a return to workable order.`;
    default:
      return `In ${eventLabel}, this actor tends to reveal the deeper incentives shaping the story.`;
  }
}

export type NarrativePhase =
  | "latent-pressure"
  | "trigger"
  | "escalation"
  | "institutional-response"
  | "coalition-fracture"
  | "settlement-or-collapse"
  | "aftermath";

export type OutcomeLikelihood = "more-likely" | "plausible" | "watch";

export interface EventInterpretation {
  eventTypeSlug: EventTypeSlug | null;
  eventLabel: string;
  meaning: string;
  narrativePhase: NarrativePhase;
  mechanisms: string[];
  archetypalTension: string;
}

export interface OutcomeScenario {
  id: string;
  title: string;
  likelihood: OutcomeLikelihood;
  description: string;
  conditions: string[];
  watchFor: string[];
  archetypalForces: string[];
}

function inferNarrativePhase(
  eventTypeSlug: EventTypeSlug | null,
  mechanismSlugs: string[]
): NarrativePhase {
  if (mechanismSlugs.some((slug) => ["regulatory-backlash", "rules-reset", "institutional-hardening"].includes(slug))) {
    return "institutional-response";
  }

  if (mechanismSlugs.some((slug) => ["rivalry-escalation", "power-transition"].includes(slug))) {
    return "escalation";
  }

  if (eventTypeSlug === "scandal-cycle" || eventTypeSlug === "legitimacy-crisis") {
    return "coalition-fracture";
  }

  if (eventTypeSlug === "leadership-change" || eventTypeSlug === "platform-transition") {
    return "trigger";
  }

  return "latent-pressure";
}

export function buildEventInterpretation(
  eventTypeSlug?: EventTypeSlug | null,
  mechanismSlugs: string[] = [],
  actors: ActorArchetypeSummary[] = []
): EventInterpretation {
  const normalizedEventType = eventTypeSlug || null;
  const eventLabel = getPublicEventTypeLabel(normalizedEventType) || "Recurring Historical Pattern";
  const actorTension = Array.from(
    new Set(actors.slice(0, 3).map((actor) => `${actor.structuralRoleLabel}: ${actor.personaLabel}`))
  );

  return {
    eventTypeSlug: normalizedEventType,
    eventLabel,
    meaning:
      getPublicEventTypeMeaning(normalizedEventType) ||
      "A recurring pressure pattern is being compared across different eras and actors.",
    narrativePhase: inferNarrativePhase(normalizedEventType, mechanismSlugs),
    mechanisms: Array.from(new Set(mechanismSlugs.map((slug) => getPublicMechanismLabel(slug) || slug))).slice(0, 4),
    archetypalTension:
      actorTension.length > 0
        ? actorTension.join(" · ")
        : "The system is still identifying which roles are carrying the pressure.",
  };
}

function outcomeScenario(
  id: string,
  title: string,
  likelihood: OutcomeLikelihood,
  description: string,
  conditions: string[],
  watchFor: string[],
  archetypalForces: string[]
): OutcomeScenario {
  return { id, title, likelihood, description, conditions, watchFor, archetypalForces };
}

/**
 * Produces transparent, conditional scenarios from the controlled taxonomy.
 * These are deliberately not numeric forecasts: the app has not yet earned
 * calibrated probabilities from a sufficiently large outcome corpus.
 */
export function buildOutcomeScenarios(
  eventTypeSlug?: EventTypeSlug | null,
  mechanismSlugs: string[] = [],
  actors: ActorArchetypeSummary[] = []
): OutcomeScenario[] {
  const incumbent = actors.find((actor) => actor.structuralRole === "incumbent");
  const challenger = actors.find((actor) => actor.structuralRole === "challenger");
  const broker = actors.find((actor) => actor.structuralRole === "broker");
  const incumbentLabel = incumbent?.personaLabel || "the incumbent";
  const challengerLabel = challenger?.personaLabel || "the challenger";
  const brokerLabel = broker?.personaLabel || "the institutional broker";
  const mechanismText = mechanismSlugs
    .slice(0, 2)
    .map((slug) => getPublicMechanismLabel(slug) || slug)
    .join(" and ");
  const sharedCondition = mechanismText
    ? `The ${mechanismText.toLowerCase()} pressure remains visible in new evidence.`
    : "The same structural pressure continues to appear across independent evidence.";

  switch (eventTypeSlug) {
    case "regulatory-crackdown":
      return [
        outcomeScenario(
          "structural-remedy",
          "The system forces a structural reset",
          "more-likely",
          `${brokerLabel} treats ${incumbentLabel} as too powerful to correct with promises alone, pushing the conflict toward separation, access rules, or a durable redesign of the field.`,
          ["Evidence of repeated abuse stays strong.", "The coalition against the incumbent remains unified."],
          ["Formal remedies that change ownership or distribution.", "New alliances forming around enforcement."],
          [incumbentLabel, brokerLabel, challengerLabel]
        ),
        outcomeScenario(
          "negotiated-guardrails",
          "The incumbent keeps the core but accepts guardrails",
          "plausible",
          `${incumbentLabel} preserves the central system by conceding narrower rules, access, or reporting requirements before the conflict becomes existential.`,
          ["The regulator wants a fast, legible win.", "The challenger coalition is fragmented or dependent on the incumbent."],
          ["Settlement language focused on conduct rather than structure.", "Leadership changes that soften the public posture."],
          [incumbentLabel, brokerLabel]
        ),
        outcomeScenario(
          "delayed-erosion",
          "The market changes before the remedy lands",
          "watch",
          `${challengerLabel} weakens the incumbent indirectly as distribution shifts, making the legal outcome less important than the system's loss of leverage.`,
          ["The legal process moves slowly.", "A credible alternative channel becomes easier to use."],
          ["Developer, customer, or audience migration.", "New gatekeepers appearing outside the dispute."],
          [challengerLabel, incumbentLabel]
        ),
      ];
    case "strategic-competition":
      return [
        outcomeScenario(
          "managed-accommodation",
          "Rivals settle into managed competition",
          "more-likely",
          "The established power and rising challenger preserve face through a negotiated boundary, proxy arrangement, or limited rules reset.",
          ["Back-channel brokers retain access.", "Both sides see escalation as more costly than compromise."],
          ["Quiet diplomatic channels.", "Mutual language about stability or red lines."],
          [incumbentLabel, challengerLabel, brokerLabel]
        ),
        outcomeScenario(
          "escalation-spiral",
          "Fear turns competition into escalation",
          "plausible",
          `${incumbentLabel} and ${challengerLabel} interpret defensive moves as proof of hostile intent, narrowing the space for reversible decisions.`,
          ["Alliance systems harden.", "Leaders are rewarded for symbolic toughness."],
          ["Tit-for-tat responses.", "Internal voices being punished for proposing restraint."],
          [incumbentLabel, challengerLabel]
        ),
        outcomeScenario(
          "coalition-realignment",
          "The surrounding coalition changes the balance",
          "watch",
          "The most important shift occurs around the rivals as smaller actors change sides, demand concessions, or create a third path.",
          ["The main rivals become overextended.", "Smaller actors gain bargaining leverage."],
          ["New security, trade, or institutional alignments.", "Former partners publicly renegotiating terms."],
          [challengerLabel, brokerLabel]
        ),
      ];
    case "platform-transition":
      return [
        outcomeScenario(
          "incumbent-adaptation",
          "The old system absorbs the new rule",
          "more-likely",
          `${incumbentLabel} adapts just enough to preserve trust while incorporating the challenger’s most useful innovation.`,
          ["The incumbent can change incentives without abandoning its installed base.", "The new platform still depends on old infrastructure."],
          ["Partnerships, acquisitions, or bundled offerings.", "The incumbent changing language before changing structure."],
          [incumbentLabel, challengerLabel]
        ),
        outcomeScenario(
          "new-gatekeeper-rise",
          "The challenger becomes the next gatekeeper",
          "plausible",
          `${challengerLabel} wins distribution and begins rewriting the rules that once protected the incumbent.`,
          ["Users or customers can move with low friction.", "The challenger controls a critical new layer."],
          ["Dependence on a new platform.", "Early signs that access is becoming concentrated again."],
          [challengerLabel]
        ),
        outcomeScenario(
          "fragmented-coexistence",
          "The field fragments instead of producing one winner",
          "watch",
          "Several systems coexist because no actor can fully control the transition or because regulators and users resist another dominant gatekeeper.",
          ["Interoperability remains possible.", "The audience values choice more than convenience."],
          ["Standards work, portability, and niche ecosystems.", "Multiple durable distribution channels."],
          [incumbentLabel, challengerLabel, brokerLabel]
        ),
      ];
    case "legitimacy-crisis":
      return [
        outcomeScenario(
          "restoration",
          "A credible restorer rebuilds trust",
          "more-likely",
          "The system survives by acknowledging the legitimacy problem and creating visible repair, accountability, or redistribution.",
          ["A trusted broker or restorer has room to act.", "The incumbent accepts reform before the coalition fully breaks."],
          ["Concrete concessions rather than symbolic messaging.", "Previously opposed groups sharing a repair agenda."],
          [incumbentLabel, brokerLabel]
        ),
        outcomeScenario(
          "hardening",
          "The incumbent protects authority through control",
          "plausible",
          `${incumbentLabel} treats dissent as disloyalty, narrowing participation and accelerating the loss of belief it is trying to prevent.`,
          ["The incumbent still controls enforcement or information.", "The opposition remains divided."],
          ["Purges, censorship, or loyalty tests.", "Insiders leaving or leaking evidence."],
          [incumbentLabel, challengerLabel]
        ),
        outcomeScenario(
          "replacement",
          "A new coalition replaces the old story",
          "watch",
          `${challengerLabel} turns moral clarity into organizational power and makes the existing order look impossible to repair.`,
          ["The challenger can coordinate beyond protest.", "The old order loses control of succession."],
          ["Parallel institutions forming.", "A former insider publicly crossing the line."],
          [challengerLabel]
        ),
      ];
    default:
      return [
        outcomeScenario(
          "adaptation",
          "The system adapts under pressure",
          "more-likely",
          `${incumbentLabel} absorbs enough change to preserve the system while the visible conflict cools.`,
          [sharedCondition, "The main actors still have incentives to keep the system functioning."],
          ["Practical concessions.", "New rules that preserve continuity while shifting leverage."],
          [incumbentLabel, challengerLabel]
        ),
        outcomeScenario(
          "hardening",
          "Defensive behavior makes the conflict worse",
          "plausible",
          `${incumbentLabel} and ${challengerLabel} respond to uncertainty by making reversible choices harder, turning pressure into a longer confrontation.`,
          [sharedCondition, "The actors are rewarded for appearing uncompromising."],
          ["Escalatory rhetoric becoming policy.", "Insiders being pushed out of decision-making."],
          [incumbentLabel, challengerLabel]
        ),
        outcomeScenario(
          "realignment",
          "A new actor captures the opening",
          "watch",
          `${challengerLabel} or another outsider uses the disruption to change who controls the next version of the system.`,
          ["A credible alternative exists.", "The incumbent is distracted by the immediate conflict."],
          ["Capital, talent, or public attention moving elsewhere.", "A broker changing sides."],
          [challengerLabel, brokerLabel]
        ),
      ];
  }
}
