import React from 'react';
import type { Player } from '../types/Player';

interface PlayerStatsProps {
  players: Player[];
  teamColor: string;
}

const PlayerStats: React.FC<PlayerStatsProps> = ({ players, teamColor }) => {

  const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="py-2 px-4 text-left">Player</th>
              <th className="py-2 px-4 text-center">K</th>
              <th className="py-2 px-4 text-center">D</th>
              <th className="py-2 px-4 text-center">A</th>
              <th className="py-2 px-4 text-center">K/D</th>
              <th className="py-2 px-4 text-center">HS%</th>
              <th className="py-2 px-4 text-center">ADR</th>
              <th className="py-2 px-4 text-center">KAST</th>
              <th className="py-2 px-4 text-center">Rating</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => {

                const hsPercentage = player.kills > 0 
                ? Math.round((player.headshots / player.kills) * 100) 
                : 0;
              
              const kdRatio = player.deaths > 0 
                ? (player.kills / player.deaths).toFixed(2) 
                : player.kills.toFixed(2);
              
              return (
                <tr key={player.steamId} className="border-b border-gray-700">
                  <td className="py-2 px-4">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: teamColor }} 
                      />
                      <span>{player.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-4 text-center">{player.kills}</td>
                  <td className="py-2 px-4 text-center">{player.deaths}</td>
                  <td className="py-2 px-4 text-center">{player.assists}</td>
                  <td className="py-2 px-4 text-center">{kdRatio}</td>
                  <td className="py-2 px-4 text-center">{hsPercentage}%</td>
                  <td className="py-2 px-4 text-center">{player.adr.toFixed(1)}</td>
                  <td className="py-2 px-4 text-center">{player.kast.toFixed(1)}%</td>
                  <td className={`py-2 px-4 text-center font-bold ${
                    player.rating >= 1.2 ? 'text-green-400' :
                    player.rating >= 1.0 ? 'text-blue-400' :
                    player.rating >= 0.8 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {player.rating.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerStats;