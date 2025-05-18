import axios from 'axios';
import type { MatchOverview } from '../types/MatchOverview';

const API_URL = 'http://localhost:5000/api';

// axios call to get the match data. this is then used in the app.tsx file
// in the future i would probablyu make more api calls to get the data
// so it gets appropriate data when its needed.
export const getMatchData = async (): Promise<MatchOverview> => {
  const res = await axios.get<MatchOverview>(`${API_URL}/match/preloaded`);
  return res.data;
};