import React from 'react';
import type { Round } from '../types/Round';

interface RoundHistoryProps {
  rounds: Round[];
}

const RoundHistory: React.FC<RoundHistoryProps> = ({ rounds }) => {
  // Prepare rounds data
  const sortedRounds = [...rounds].sort((a, b) => a.number - b.number);
  

  

  const formatWinReason = (winner: 'T' | 'CT', reason: string): string => {
    const formattedReason = reason.replace(/_/g, ' ');
    
    if (winner === 'T') {
      if (formattedReason.includes('Bomb')) {
        return 'Bomb detonated';
      } else if (formattedReason.includes('Elimination')) {
        return 'CT team eliminated';
      } else {
        return formattedReason;
      }
    } else {
      if (formattedReason.includes('Defuse')) {
        return 'Bomb defused';
      } else if (formattedReason.includes('Elimination')) {
        return 'T team eliminated';
      } else {
        return formattedReason;
      }
    }
  };
  
  // format duration so its in mins and secs 
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Round History</h3>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {sortedRounds.map((round) => (
          <div 
            key={round.number}
            className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium ${
              round.winner === 'T' 
                ? 'bg-yellow-800 text-yellow-200 border border-yellow-600' 
                : 'bg-blue-800 text-blue-200 border border-blue-600'
            }`}
            title={`Round ${round.number}: ${round.winner} win (${formatWinReason(round.winner, round.winReason)})`}
          >
            {round.number}
          </div>
        ))}
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="py-2 px-4 text-left">Round</th>
              <th className="py-2 px-4 text-left">Winner</th>
              <th className="py-2 px-4 text-left">Win Reason</th>
              <th className="py-2 px-4 text-center">Score (T-CT)</th>
              <th className="py-2 px-4 text-center">Duration</th>
              <th className="py-2 px-4 text-center">Key Events</th>
            </tr>
          </thead>
          <tbody>
            {sortedRounds.map((round) => {
              
              const bombEvents = round.events.filter(event => 
                event.type === 'bomb_planted' || 
                event.type === 'bomb_defused' || 
                event.type === 'bomb_exploded'
              );
              
              return (
                <tr key={round.number} className="border-b border-gray-700">
                  <td className="py-2 px-4">Round {round.number}</td>
                  <td className="py-2 px-4">
                    <span className={`px-2 py-1 rounded ${
                      round.winner === 'T' 
                        ? 'bg-yellow-800 text-yellow-200' 
                        : 'bg-blue-800 text-blue-200'
                    }`}>
                      {round.winner}
                    </span>
                  </td>
                  <td className="py-2 px-4">{formatWinReason(round.winner, round.winReason)}</td>
                  <td className="py-2 px-4 text-center">
                    <span className="text-yellow-400">{round.tScore}</span>
                    {' - '}
                    <span className="text-blue-400">{round.ctScore}</span>
                  </td>
                  <td className="py-2 px-4 text-center">{formatDuration(round.duration)}</td>
                  <td className="py-2 px-4">
                    <div className="flex flex-wrap gap-1">
                      {bombEvents.map((event, index) => (
                        <span 
                          key={index}
                          className={`px-2 py-1 text-xs rounded ${
                            event.type === 'bomb_planted' 
                              ? 'bg-red-900 text-red-200' 
                              : event.type === 'bomb_defused'
                                ? 'bg-green-900 text-green-200'
                                : 'bg-orange-900 text-orange-200'
                          }`}
                        >
                          {event.type === 'bomb_planted' 
                            ? `Bomb pplanted by ${event.player}` 
                            : event.type === 'bomb_defused'
                              ? ` Defused by ${event.player}`
                              : ' Bomb exploded'
                          }
                        </span>
                      ))}
                      
                      {bombEvents.length === 0 && (
                        <span className="text-gray-400 text-sm italic">No bomb events</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6">
        <h4 className="text-md font-semibold mb-2">Round Win Distribution</h4>
        <div className="flex gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-700 rounded-sm mr-2"></div>
            <span>T Wins: {sortedRounds.filter(round => round.winner === 'T').length}</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-700 rounded-sm mr-2"></div>
            <span>CT Wins: {sortedRounds.filter(round => round.winner === 'CT').length}</span>
          </div>
        </div>
        
        
        <div className="mt-4">
          <h4 className="text-md font-semibold mb-2">Win Streaks</h4>
          {(() => {
            
            let currentTeam = '';
            let currentStreak = 0;
            const streaks: { team: 'T' | 'CT', count: number }[] = [];
            
            sortedRounds.forEach(round => {
              if (currentTeam === round.winner) {
                currentStreak++;
              } else {
                if (currentTeam && currentStreak > 1) {
                  streaks.push({ team: currentTeam as 'T' | 'CT', count: currentStreak });
                }
                currentTeam = round.winner;
                currentStreak = 1;
              }
            });
            
            
            if (currentTeam && currentStreak > 1) {
              streaks.push({ team: currentTeam as 'T' | 'CT', count: currentStreak });
            }
            
            return streaks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {streaks.map((streak, index) => (
                  <div 
                    key={index}
                    className={`px-3 py-1 rounded ${
                      streak.team === 'T' 
                        ? 'bg-yellow-900 text-yellow-200' 
                        : 'bg-blue-900 text-blue-200'
                    }`}
                  >
                    {streak.team} won {streak.count} in a row
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-sm italic">No significant win streaks</div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default RoundHistory;