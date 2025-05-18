import React, { useState, useEffect } from 'react';
import { getMatchData } from './services/api';
import type { MatchOverview } from './types/MatchOverview';
import MatchDashboard from './components/MatchDashboard';
import './index.css';

const App: React.FC = () => {
  const [match, setMatch] = useState<MatchOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadPreloadedMatch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMatchData();
      setMatch(data); // parse data into matchoverview 
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load preloaded match');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  
  useEffect(() => {
    // load the match from the uploads folder
    loadPreloadedMatch();
  }, []);
  
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Blast.tv coding challenge Arun</h1>
         
      {loading && (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-900 border border-red-600 text-red-100 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <button 
            className="mt-2 bg-red-700 hover:bg-red-800 text-white py-1 px-3 rounded text-sm"
            onClick={loadPreloadedMatch}> {/* button for loading if it doesnt work first time. If it doesnt work the api probably isnt on */ }
            Try Loading Preloaded Match
          </button>
        </div>
      )}
      
      {match && <MatchDashboard matchData={match} />} 
    </div>
  );
};

export default App;