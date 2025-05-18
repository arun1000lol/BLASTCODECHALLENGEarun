// Player information
export interface Player {
  steamId: string;
  name: string;
  team: 'T' | 'CT' | 'Unknown';
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  damage: number;
  adr: number; 
  kast: number; 
  rating: number;
  weapons: Record<string, number>; // Weapon usage count
  utilThrown: number;
}

// Round information
export interface Round {
  number: number;
  winner: 'T' | 'CT';
  winReason: string;
  tScore: number;
  ctScore: number;
  duration: number;
  events: RoundEvent[];
}

// Round event (kill, bomb plant, etc.)
export interface RoundEvent {
  type: 'round_start' | 'round_end' | 'kill' | 'bomb_planted' | 'bomb_defused' | 'bomb_exploded' | 'assist' | 'other';
  time: string;
  player?: string;
  target?: string;
  weapon?: string;
  headshot?: boolean;
  details?: string;
}

// Match overview
export interface MatchOverview {
  map: string;
  date: string;
  teams: {
    navi: {
      name: string;
      score: number;
      players: Player[];
    };
    Vitality: {
      name: string;
      score: number;
      players: Player[];
    };
  };
  rounds: Round[];
  totalRounds: number;
  duration: string;
  winner: string;
  averageMatchTime: string;
}