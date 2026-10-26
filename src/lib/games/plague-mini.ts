/**
 * Plague Mini - Epidemic Simulation & Mutation Strategy Engine
 * Real-time SIRD epidemic differential dynamics, climatic adaptation,
 * intercontinental air & sea transit, dynamic Cure research, and DNA mutation tree.
 */

export interface Region {
  id: string;
  name: string;
  x: number; // 0..100 map coordinates
  y: number; // 0..100 map coordinates
  population: number;
  infected: number;
  dead: number;
  climate: 'cold' | 'hot' | 'temperate';
  wealth: 'rich' | 'poor';
  density: 'dense' | 'sparse';
  hasAirport: boolean;
  hasSeaport: boolean;
  airportClosed: boolean;
  seaportClosed: boolean;
  color: string;
}

export type TraitCategory = 'transmission' | 'symptom' | 'ability';

export interface TraitDef {
  id: string;
  name: string;
  category: TraitCategory;
  cost: number;
  prerequisites: string[];
  infectivity: number;
  severity: number;
  lethality: number;
  coldBonus?: number;
  hotBonus?: number;
  richBonus?: number;
  airBonus?: number;
  seaBonus?: number;
  cureSlowdown?: number; // % cure rate reduced
  description: string;
}

export const TRAITS: Record<string, TraitDef> = {
  // Transmissions
  air_1: {
    id: 'air_1',
    name: 'Air 1',
    category: 'transmission',
    cost: 9,
    prerequisites: [],
    infectivity: 12,
    severity: 0,
    lethality: 0,
    airBonus: 0.35,
    description: 'Pathogen travels on dust particles. Increases airplane spread and dry climate transmission.',
  },
  air_2: {
    id: 'air_2',
    name: 'Air 2',
    category: 'transmission',
    cost: 15,
    prerequisites: ['air_1'],
    infectivity: 20,
    severity: 0,
    lethality: 0,
    airBonus: 0.6,
    description: 'Survives high-altitude filtration. Greatly boosts air travel infection rates.',
  },
  water_1: {
    id: 'water_1',
    name: 'Water 1',
    category: 'transmission',
    cost: 10,
    prerequisites: [],
    infectivity: 14,
    severity: 0,
    lethality: 0,
    seaBonus: 0.4,
    description: 'Pathogen survives in fresh and salt water. Increases sea lane and coastal spread.',
  },
  water_2: {
    id: 'water_2',
    name: 'Water 2',
    category: 'transmission',
    cost: 16,
    prerequisites: ['water_1'],
    infectivity: 22,
    severity: 0,
    lethality: 0,
    seaBonus: 0.65,
    description: 'Impervious to ship ballast chlorination. Dominates overseas sea routes.',
  },
  bird_1: {
    id: 'bird_1',
    name: 'Bird 1',
    category: 'transmission',
    cost: 12,
    prerequisites: [],
    infectivity: 16,
    severity: 0,
    lethality: 0,
    description: 'Migratory birds carry pathogen across land borders, bypassing closed airports.',
  },
  rodent_1: {
    id: 'rodent_1',
    name: 'Rodent 1',
    category: 'transmission',
    cost: 11,
    prerequisites: [],
    infectivity: 18,
    severity: 1,
    lethality: 0,
    description: 'Fleas and city rats rapidly spread contagion in densely populated metropolitan areas.',
  },

  // Symptoms
  coughing: {
    id: 'coughing',
    name: 'Coughing',
    category: 'symptom',
    cost: 4,
    prerequisites: [],
    infectivity: 10,
    severity: 2,
    lethality: 0,
    description: 'Mild spasmodic coughing expels infected droplets into surrounding air.',
  },
  sneezing: {
    id: 'sneezing',
    name: 'Sneezing',
    category: 'symptom',
    cost: 6,
    prerequisites: ['coughing'],
    infectivity: 15,
    severity: 3,
    lethality: 0,
    description: 'Violent fluid sneezing dramatically raises local infection rates.',
  },
  rash: {
    id: 'rash',
    name: 'Rash',
    category: 'symptom',
    cost: 5,
    prerequisites: [],
    infectivity: 8,
    severity: 3,
    lethality: 0,
    description: 'Painful lesions on the skin, slightly increasing contagiousness.',
  },
  fever: {
    id: 'fever',
    name: 'Fever',
    category: 'symptom',
    cost: 12,
    prerequisites: ['coughing'],
    infectivity: 12,
    severity: 10,
    lethality: 4,
    description: 'High body temperature causes severe fatigue and mild fatal complications.',
  },
  pulmonary_edema: {
    id: 'pulmonary_edema',
    name: 'Pulmonary Edema',
    category: 'symptom',
    cost: 18,
    prerequisites: ['fever'],
    infectivity: 15,
    severity: 22,
    lethality: 15,
    description: 'Fluid accumulates in the lungs. Highly fatal and raises global research alarms.',
  },
  organ_failure: {
    id: 'organ_failure',
    name: 'Total Organ Failure',
    category: 'symptom',
    cost: 28,
    prerequisites: ['pulmonary_edema'],
    infectivity: 10,
    severity: 45,
    lethality: 40,
    description: 'Systemic catastrophic collapse of multiple internal organs. Rapidly kills infected hosts.',
  },
  necrosis: {
    id: 'necrosis',
    name: 'Necrosis',
    category: 'symptom',
    cost: 26,
    prerequisites: ['rash'],
    infectivity: 25,
    severity: 35,
    lethality: 30,
    description: 'Mass gangrenous decay of active flesh. Severe lethality and extreme airborne spread.',
  },

  // Abilities
  cold_1: {
    id: 'cold_1',
    name: 'Cold Resistance 1',
    category: 'ability',
    cost: 8,
    prerequisites: [],
    infectivity: 5,
    severity: 0,
    lethality: 0,
    coldBonus: 0.6,
    description: 'Protective lipid membrane prevents freezing in cold climates (Russia, Greenland, Canada).',
  },
  cold_2: {
    id: 'cold_2',
    name: 'Cold Resistance 2',
    category: 'ability',
    cost: 14,
    prerequisites: ['cold_1'],
    infectivity: 10,
    severity: 0,
    lethality: 0,
    coldBonus: 1.2,
    description: 'Allows pathogen to flourish in sub-zero polar blizzards and tundra.',
  },
  heat_1: {
    id: 'heat_1',
    name: 'Heat Resistance 1',
    category: 'ability',
    cost: 8,
    prerequisites: [],
    infectivity: 5,
    severity: 0,
    lethality: 0,
    hotBonus: 0.6,
    description: 'Pathogen cellular wall withstands arid desert heat (Africa, Middle East).',
  },
  heat_2: {
    id: 'heat_2',
    name: 'Heat Resistance 2',
    category: 'ability',
    cost: 14,
    prerequisites: ['heat_1'],
    infectivity: 10,
    severity: 0,
    lethality: 0,
    hotBonus: 1.2,
    description: 'Extreme thermal tolerance for equatorial jungles and heatwaves.',
  },
  drug_1: {
    id: 'drug_1',
    name: 'Drug Resistance 1',
    category: 'ability',
    cost: 11,
    prerequisites: [],
    infectivity: 6,
    severity: 0,
    lethality: 0,
    richBonus: 0.6,
    description: 'Resists standard first-line antibiotics, enabling rapid spread in wealthy nations.',
  },
  drug_2: {
    id: 'drug_2',
    name: 'Drug Resistance 2',
    category: 'ability',
    cost: 20,
    prerequisites: ['drug_1'],
    infectivity: 12,
    severity: 0,
    lethality: 0,
    richBonus: 1.2,
    description: 'Complete resistance to high-grade lab pharmaceuticals and sterile environments.',
  },
  genetic_hardening: {
    id: 'genetic_hardening',
    name: 'Genetic Hardening',
    category: 'ability',
    cost: 18,
    prerequisites: [],
    infectivity: 0,
    severity: 0,
    lethality: 0,
    cureSlowdown: 0.35,
    description: 'Complex DNA sequence makes laboratory sequencing and vaccine creation much harder.',
  },
  genetic_reshuffle: {
    id: 'genetic_reshuffle',
    name: 'Genetic Reshuffle',
    category: 'ability',
    cost: 24,
    prerequisites: ['genetic_hardening'],
    infectivity: 0,
    severity: 0,
    lethality: 0,
    cureSlowdown: 0.5,
    description: 'Randomly mutates core amino acids, wiping out a significant chunk of existing cure research.',
  },
};

export interface TransitVehicle {
  id: string;
  type: 'plane' | 'ship';
  fromId: string;
  toId: string;
  progress: number; // 0..1
  speed: number;
  isInfected: boolean;
}

export interface PopBubble {
  id: string;
  type: 'dna' | 'cure' | 'hazard';
  x: number; // percentage
  y: number; // percentage
  value: number;
  duration: number; // seconds remaining
}

export interface NewsItem {
  id: string;
  text: string;
  category: 'alert' | 'info' | 'critical';
  time: number;
}

export class PlagueEngine {
  public regions: Region[] = [];
  public unlockedTraits: Set<string> = new Set();
  public dnaPoints = 12;

  // Pathogen stats
  public infectivity = 6;
  public severity = 0;
  public lethality = 0;

  // World Status
  public totalPopulation = 0;
  public totalInfected = 0;
  public totalDead = 0;
  public totalHealthy = 0;

  // Cure Research
  public cureProgress = 0; // 0..100
  public cureSpeed = 0; // % per second
  public isCureStarted = false;

  // Vehicles & Bubbles
  public vehicles: TransitVehicle[] = [];
  public bubbles: PopBubble[] = [];
  public newsFeed: NewsItem[] = [];

  // Clock
  public day = 1;
  public dayProgress = 0;
  public daySeconds = 1.0; // 1 second = 1 day at 1x
  public gameSpeed = 1.0;
  public isPaused = false;
  public gameOver = false;
  public victory = false;

  // Starting country
  public startingRegionId = 'east_asia';

  constructor() {
    this.initWorld();
    this.recalculatePathogenStats();
    this.infectPatientZero(this.startingRegionId);
  }

  public initWorld(): void {
    this.regions = [
      {
        id: 'north_america',
        name: 'North America',
        x: 20,
        y: 28,
        population: 590_000_000,
        infected: 0,
        dead: 0,
        climate: 'temperate',
        wealth: 'rich',
        density: 'dense',
        hasAirport: true,
        hasSeaport: true,
        airportClosed: false,
        seaportClosed: false,
        color: '#38bdf8',
      },
      {
        id: 'south_america',
        name: 'South America',
        x: 32,
        y: 65,
        population: 430_000_000,
        infected: 0,
        dead: 0,
        climate: 'hot',
        wealth: 'poor',
        density: 'dense',
        hasAirport: true,
        hasSeaport: true,
        airportClosed: false,
        seaportClosed: false,
        color: '#4ade80',
      },
      {
        id: 'western_europe',
        name: 'Western Europe',
        x: 48,
        y: 25,
        population: 520_000_000,
        infected: 0,
        dead: 0,
        climate: 'temperate',
        wealth: 'rich',
        density: 'dense',
        hasAirport: true,
        hasSeaport: true,
        airportClosed: false,
        seaportClosed: false,
        color: '#a78bfa',
      },
      {
        id: 'russia_siberia',
        name: 'Russia & North',
        x: 72,
        y: 18,
        population: 145_000_000,
        infected: 0,
        dead: 0,
        climate: 'cold',
        wealth: 'poor',
        density: 'sparse',
        hasAirport: true,
        hasSeaport: true,
        airportClosed: false,
        seaportClosed: false,
        color: '#94a3b8',
      },
      {
        id: 'sub_saharan_africa',
        name: 'Africa',
        x: 52,
        y: 55,
        population: 1_200_000_000,
        infected: 0,
        dead: 0,
        climate: 'hot',
        wealth: 'poor',
        density: 'dense',
        hasAirport: true,
        hasSeaport: true,
        airportClosed: false,
        seaportClosed: false,
        color: '#fbbf24',
      },
      {
        id: 'east_asia',
        name: 'East Asia',
        x: 82,
        y: 35,
        population: 1_650_000_000,
        infected: 0,
        dead: 0,
        climate: 'temperate',
        wealth: 'rich',
        density: 'dense',
        hasAirport: true,
        hasSeaport: true,
        airportClosed: false,
        seaportClosed: false,
        color: '#f87171',
      },
      {
        id: 'south_asia',
        name: 'South Asia',
        x: 70,
        y: 45,
        population: 1_900_000_000,
        infected: 0,
        dead: 0,
        climate: 'hot',
        wealth: 'poor',
        density: 'dense',
        hasAirport: true,
        hasSeaport: true,
        airportClosed: false,
        seaportClosed: false,
        color: '#fb923c',
      },
      {
        id: 'oceania',
        name: 'Oceania & Australia',
        x: 88,
        y: 72,
        population: 42_000_000,
        infected: 0,
        dead: 0,
        climate: 'hot',
        wealth: 'rich',
        density: 'sparse',
        hasAirport: true,
        hasSeaport: true,
        airportClosed: false,
        seaportClosed: false,
        color: '#2dd4bf',
      },
      {
        id: 'greenland',
        name: 'Greenland',
        x: 35,
        y: 12,
        population: 56_000,
        infected: 0,
        dead: 0,
        climate: 'cold',
        wealth: 'poor',
        density: 'sparse',
        hasAirport: false,
        hasSeaport: true,
        airportClosed: true,
        seaportClosed: false,
        color: '#cbd5e1',
      },
      {
        id: 'madagascar',
        name: 'Madagascar',
        x: 63,
        y: 70,
        population: 28_000_000,
        infected: 0,
        dead: 0,
        climate: 'hot',
        wealth: 'poor',
        density: 'sparse',
        hasAirport: false,
        hasSeaport: true,
        airportClosed: true,
        seaportClosed: false,
        color: '#e879f9',
      },
    ];

    this.totalPopulation = this.regions.reduce((acc, r) => acc + r.population, 0);
    this.totalHealthy = this.totalPopulation;
  }

  public infectPatientZero(regionId: string): void {
    const r = this.regions.find(reg => reg.id === regionId);
    if (r) {
      r.infected = 10;
      this.totalInfected = 10;
      this.totalHealthy = this.totalPopulation - 10;
      this.addNews(`Patient Zero infected in ${r.name}. A new mysterious pathogen emerges.`, 'info');
      this.spawnBubble('dna', r.x, r.y, 3);
    }
  }

  public recalculatePathogenStats(): void {
    let inf = 8;
    let sev = 0;
    let letVal = 0;

    for (const traitId of this.unlockedTraits) {
      const trait = TRAITS[traitId];
      if (trait) {
        inf += trait.infectivity;
        sev += trait.severity;
        letVal += trait.lethality;
      }
    }

    this.infectivity = inf;
    this.severity = sev;
    this.lethality = letVal;
  }

  public canUnlockTrait(traitId: string): boolean {
    if (this.unlockedTraits.has(traitId)) return false;
    const trait = TRAITS[traitId];
    if (!trait) return false;
    if (this.dnaPoints < trait.cost) return false;

    // Check prerequisites
    if (trait.prerequisites.length > 0) {
      return trait.prerequisites.some(prereq => this.unlockedTraits.has(prereq));
    }

    return true;
  }

  public unlockTrait(traitId: string): boolean {
    if (!this.canUnlockTrait(traitId)) return false;
    const trait = TRAITS[traitId];
    this.dnaPoints -= trait.cost;
    this.unlockedTraits.add(traitId);
    this.recalculatePathogenStats();

    // Special effects
    if (trait.id === 'genetic_reshuffle') {
      this.cureProgress = Math.max(0, this.cureProgress - 25);
      this.addNews('Genetic Reshuffle: Vaccine researchers sent back to the drawing board! (-25% Cure)', 'alert');
    }

    this.addNews(`Pathogen mutated: ${trait.name} evolved!`, 'info');
    return true;
  }

  /**
   * Advances epidemic simulation by dt seconds.
   */
  public update(dt: number): void {
    if (this.isPaused || this.gameOver) return;

    const effectiveDt = dt * this.gameSpeed;

    // 1. Advance Day Clock
    this.dayProgress += effectiveDt / this.daySeconds;
    if (this.dayProgress >= 1.0) {
      const daysPassed = Math.floor(this.dayProgress);
      this.dayProgress -= daysPassed;
      for (let i = 0; i < daysPassed; i++) {
        this.stepDay();
        if (this.gameOver) return;
      }
    }

    // 2. Update Active Transit Vehicles
    this.updateVehicles(effectiveDt);

    // 3. Update Pop Bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.duration -= effectiveDt;
      if (b.duration <= 0) {
        this.bubbles.splice(i, 1);
      }
    }

    // 4. Update Cure Research
    if (this.isCureStarted && !this.gameOver) {
      let slowdown = 0;
      if (this.unlockedTraits.has('genetic_hardening')) slowdown += 0.35;
      if (this.unlockedTraits.has('genetic_reshuffle')) slowdown += 0.25;

      const effectiveSpeed = Math.max(0.01, this.cureSpeed * (1 - slowdown));
      this.cureProgress = Math.min(100, this.cureProgress + effectiveSpeed * effectiveDt);

      if (this.cureProgress >= 100) {
        this.cureProgress = 100;
        this.gameOver = true;
        this.victory = false;
        this.addNews('GLOBAL CURE DISTRIBUTED: The world eradicates the pathogen. Humanity is saved!', 'critical');
      }
    }
  }

  /**
   * Advances mathematical SIRD epidemic model for 1 in-game day.
   */
  public stepDay(): void {
    this.day++;

    let newTotalInfected = 0;
    let newTotalDead = 0;

    for (const r of this.regions) {
      if (r.infected <= 0 && r.dead >= r.population) {
        newTotalDead += r.dead;
        continue;
      }

      const susceptible = Math.max(0, r.population - r.infected - r.dead);

      // Environmental modifiers
      let climateBonus = 1.0;
      if (r.climate === 'cold') {
        climateBonus = this.unlockedTraits.has('cold_2') ? 1.4 : this.unlockedTraits.has('cold_1') ? 1.0 : 0.3;
      } else if (r.climate === 'hot') {
        climateBonus = this.unlockedTraits.has('heat_2') ? 1.4 : this.unlockedTraits.has('heat_1') ? 1.0 : 0.4;
      }

      let wealthBonus = 1.0;
      if (r.wealth === 'rich') {
        wealthBonus = this.unlockedTraits.has('drug_2') ? 1.3 : this.unlockedTraits.has('drug_1') ? 0.9 : 0.35;
      }

      let densityBonus = r.density === 'dense' ? 1.25 : 0.75;
      if (this.unlockedTraits.has('rodent_1') && r.density === 'dense') {
        densityBonus *= 1.4;
      }

      // Daily Infection Equation: beta * S * I / N
      const beta = (this.infectivity / 100) * 0.18 * climateBonus * wealthBonus * densityBonus;
      if (r.infected > 0 && susceptible > 0) {
        const newlyInfected = Math.min(susceptible, Math.max(1, Math.round(beta * r.infected * (susceptible / r.population))));
        r.infected += newlyInfected;
      }

      // Daily Mortality Equation: gamma * I
      if (r.infected > 0 && this.lethality > 0) {
        const gamma = (this.lethality / 100) * 0.08;
        const newlyDead = Math.min(r.infected, Math.max(1, Math.round(gamma * r.infected)));
        r.infected -= newlyDead;
        r.dead += newlyDead;
      }

      // Border closure triggers as severity & death rises
      if (r.dead > 50_000 || r.infected > r.population * 0.4) {
        if (!r.airportClosed && r.hasAirport) {
          r.airportClosed = true;
          this.addNews(`${r.name} shuts down all international flights.`, 'alert');
        }
        if (!r.seaportClosed && r.hasSeaport && (r.dead > 200_000 || r.infected > r.population * 0.6)) {
          r.seaportClosed = true;
          this.addNews(`${r.name} closes all maritime seaports to prevent spread.`, 'alert');
        }
      }

      newTotalInfected += r.infected;
      newTotalDead += r.dead;
    }

    this.totalInfected = newTotalInfected;
    this.totalDead = newTotalDead;
    this.totalHealthy = Math.max(0, this.totalPopulation - this.totalInfected - this.totalDead);

    // Global Awareness & Cure Research Initiation
    if (!this.isCureStarted) {
      if (this.severity >= 15 || this.totalDead > 100_000 || this.totalInfected > 500_000_000) {
        this.isCureStarted = true;
        this.cureSpeed = 0.035; // base research rate
        this.addNews('WHO sounds highest global alert: International vaccine consortium initiated!', 'critical');
      }
    } else {
      // Research speed accelerates with total deaths and severity
      const urgency = Math.min(3.5, 1 + (this.totalDead / 100_000_000) + (this.severity / 40));
      this.cureSpeed = 0.035 * urgency;

      // Spawn Blue Cure Bubbles occasionally in rich leading research hubs
      if (Math.random() < 0.08 && this.bubbles.length < 5) {
        const richHubs = this.regions.filter(reg => reg.wealth === 'rich' && reg.dead < reg.population * 0.8);
        if (richHubs.length > 0) {
          const hub = richHubs[Math.floor(Math.random() * richHubs.length)];
          this.spawnBubble('cure', hub.x + (Math.random() - 0.5) * 6, hub.y + (Math.random() - 0.5) * 6, 2);
        }
      }
    }

    // Spawn Red DNA Bubbles on infection milestones
    if (Math.random() < 0.15 && this.bubbles.length < 5) {
      const activeInfected = this.regions.filter(reg => reg.infected > 100);
      if (activeInfected.length > 0) {
        const picked = activeInfected[Math.floor(Math.random() * activeInfected.length)];
        this.spawnBubble('dna', picked.x + (Math.random() - 0.5) * 6, picked.y + (Math.random() - 0.5) * 6, 2);
      }
    }

    // Spawn Flights and Voyages periodically
    this.maybeSpawnTransitVehicle();

    // Check Victory / Defeat
    if (this.totalDead >= this.totalPopulation * 0.999 || (this.totalHealthy === 0 && this.totalInfected === 0 && this.totalDead > 0)) {
      this.gameOver = true;
      this.victory = true;
      this.addNews('TOTAL EXTINCTION: The pathogen has eradicated all human life on Earth. Victory!', 'critical');
    } else if (this.totalInfected === 0 && this.totalHealthy > 0) {
      this.gameOver = true;
      this.victory = false;
      this.addNews('PATHOGEN EXTINCT: All infected hosts perished before contagion reached everyone.', 'critical');
    }
  }

  public maybeSpawnTransitVehicle(): void {
    if (this.vehicles.length >= 8) return;

    const availableOrigins = this.regions.filter(r => r.infected > 0 && r.dead < r.population * 0.95);
    if (availableOrigins.length === 0) return;

    const from = availableOrigins[Math.floor(Math.random() * availableOrigins.length)];
    const otherRegions = this.regions.filter(r => r.id !== from.id);
    if (otherRegions.length === 0) return;
    const to = otherRegions[Math.floor(Math.random() * otherRegions.length)];

    const useAir = from.hasAirport && to.hasAirport && !from.airportClosed && !to.airportClosed;
    const useSea = from.hasSeaport && to.hasSeaport && !from.seaportClosed && !to.seaportClosed;

    if (!useAir && !useSea) return;

    const type = useAir && useSea ? (Math.random() < 0.6 ? 'plane' : 'ship') : useAir ? 'plane' : 'ship';
    const infectRatio = from.infected / from.population;
    const isInfected = Math.random() < Math.max(0.15, infectRatio * 2.5);

    this.vehicles.push({
      id: `trans_${Date.now()}_${Math.random()}`,
      type,
      fromId: from.id,
      toId: to.id,
      progress: 0,
      speed: type === 'plane' ? 0.35 : 0.18,
      isInfected,
    });
  }

  public updateVehicles(dt: number): void {
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      v.progress += dt * v.speed;

      if (v.progress >= 1.0) {
        // Arrival!
        const dest = this.regions.find(r => r.id === v.toId);
        if (dest && v.isInfected) {
          if (dest.infected === 0 && dest.dead < dest.population) {
            dest.infected = 15;
            this.addNews(`${dest.name} infected via overseas ${v.type} transit!`, 'alert');
            this.spawnBubble('dna', dest.x, dest.y, 4);
          } else if (dest.infected > 0) {
            dest.infected += 25;
          }
        }
        this.vehicles.splice(i, 1);
      }
    }
  }

  public spawnBubble(type: PopBubble['type'], x: number, y: number, value: number): void {
    this.bubbles.push({
      id: `bubble_${Date.now()}_${Math.random()}`,
      type,
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(10, Math.min(90, y)),
      value,
      duration: 6.0,
    });
  }

  public popBubble(bubbleId: string): { type: PopBubble['type']; value: number } | null {
    const idx = this.bubbles.findIndex(b => b.id === bubbleId);
    if (idx === -1) return null;

    const b = this.bubbles[idx];
    this.bubbles.splice(idx, 1);

    if (b.type === 'dna') {
      this.dnaPoints += b.value;
    } else if (b.type === 'cure') {
      this.cureProgress = Math.max(0, this.cureProgress - b.value);
    }

    return { type: b.type, value: b.value };
  }

  public addNews(text: string, category: NewsItem['category']): void {
    this.newsFeed.unshift({
      id: `news_${Date.now()}_${Math.random()}`,
      text,
      category,
      time: this.day,
    });
    if (this.newsFeed.length > 20) {
      this.newsFeed.pop();
    }
  }
}
