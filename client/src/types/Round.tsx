import type { RoundEvent } from "./RoundEvent";


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