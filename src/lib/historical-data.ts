export interface HistoricalSeedEvent {
  title: string;
  year: string;
  archetype: string;
  description: string;
  structuralSkeleton?: string;
}

export const goldenSet: HistoricalSeedEvent[] = [
  {
    title: "The Fall of the Roman Empire",
    year: "476 AD",
    archetype: "Imperial Overstretch",
    description:
      "The collapse of the Western Roman Empire due to a combination of internal decay, economic instability, military overstretch, and external pressure from migrating tribes.",
    structuralSkeleton:
      "A dominant imperial system weakens through internal fragmentation, fiscal strain, military overextension, and external pressure until central authority collapses.",
  },
  {
    title: "The French Revolution",
    year: "1789",
    archetype: "Populist Uprising",
    description:
      "A period of radical political and societal change in France that began with the Estates General of 1789, leading to the abolition of the monarchy and the rise of radical political factions.",
    structuralSkeleton:
      "A fiscally stressed ruling order loses legitimacy, mass grievance turns into insurgent mobilization, legacy institutions are dismantled, and radical factions compete to define the new order.",
  },
  {
    title: "The Industrial Revolution",
    year: "1760-1840",
    archetype: "Technological Paradigm Shift",
    description:
      "The transition to new manufacturing processes in Great Britain, continental Europe, and the United States, marking a major turning point in history with profound social and economic impacts.",
    structuralSkeleton:
      "A new production technology compounds across infrastructure, labor, and capital systems, rapidly increasing output while destabilizing existing social and economic arrangements.",
  },
  {
    title: "The Peloponnesian War",
    year: "431-404 BC",
    archetype: "Thucydides Trap",
    description:
      "An ancient Greek war fought by the Delian League led by Athens against the Peloponnesian League led by Sparta, demonstrating the inevitable conflict when a rising power threatens an established hegemon.",
    structuralSkeleton:
      "An established hegemon perceives a rising rival as an existential threat, alliance systems harden, and fear-driven escalation turns strategic competition into prolonged war.",
  },
  {
    title: "The Cuban Missile Crisis",
    year: "1962",
    archetype: "Brinkmanship",
    description:
      "A 13-day confrontation between the United States and the Soviet Union initiated by the American discovery of Soviet ballistic missile deployment in Cuba, the closest the Cold War came to escalating into a full-scale nuclear war.",
    structuralSkeleton:
      "Two heavily armed rivals edge toward direct conflict after forward military deployments disrupt the strategic balance, forcing high-stakes negotiation to avert catastrophe.",
  },
];
