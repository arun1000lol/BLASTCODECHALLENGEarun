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
  weapons: Record<string, number>; 
  utilThrown: number; 
}