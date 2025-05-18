// Round event (kill, bomb plant, etc.)
export interface RoundEvent {
  type: 'kill' | 'bomb_planted' | 'bomb_defused' | 'bomb_exploded' | 'round_start' | 'round_end' | 'other';
  time: string;
  player?: string;
  target?: string;
  weapon?: string;
  headshot?: boolean;
  details?: string;
}