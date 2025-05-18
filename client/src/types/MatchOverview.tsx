import type { Player } from './Player';
import type { Round } from './Round';

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