import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine
} from 'recharts';
import type { MatchOverview } from '../types/MatchOverview';
import PlayerStats from './PlayerStats';
import RoundHistory from './RoundHistory';
import vitalityLogo from '../assets/Team_Vitality_2021_allmode.svg';
import naviLogo from '../assets/600px-Natus_Vincere_2021_lightmode.svg';

interface MatchDashboardProps {
  matchData: MatchOverview;
}


const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const T_SIDE = '#FFD700'; // gold for terrorists
const CT_SIDE = '#1E90FF'; // blue for CTs
const TEAM_COLORS = {
  T: T_SIDE,
  CT: CT_SIDE
};

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'players', label: 'Players' },
  { key: 'rounds', label: 'Rounds' },
  { key: 'weapons', label: 'Weapons' }
];

const MatchDashboard: React.FC<MatchDashboardProps> = ({ matchData }) => {
  const [selectedTab, setSelectedTab] = useState<string>('overview');

  // console.log('matchData:', matchData); 

  // Prepare data for charts
  const playerKillsData = [...matchData.teams.Vitality.players, ...matchData.teams.navi.players]
    .sort((a, b) => b.kills - a.kills);

  const playerUtilData = [...matchData.teams.Vitality.players, ...matchData.teams.navi.players]
    .sort((a, b) => (b.utilThrown || 0) - (a.utilThrown || 0)); // added null check after getting NaN

  const top3Utils = playerUtilData.slice(0, 3);

  // sort podium
  const podium = [...top3Utils].sort((a, b) => (a.utilThrown || 0) - (b.utilThrown || 0));

  // Count round wins by side 
  const roundWinsData = matchData.rounds.reduce((acc, round) => {
    const winner = round.winner;
    acc[winner] = (acc[winner] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(roundWinsData).map(([name, value]) => ({ name, value }));

  // Group weapons data
  const weaponsData = [...matchData.teams.Vitality.players, ...matchData.teams.navi.players].reduce((acc, player) => {
    Object.entries(player.weapons || {}).forEach(([weapon, count]) => {
      acc[weapon] = (acc[weapon] || 0) + count;
    });
    return acc;
  }, {} as Record<string, number>);

  const topWeaponsData = Object.entries(weaponsData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // Trying to figure out who started CT side by checking first round kills this will fail if vitality had 0 kills at the start of the round. so idk
  const vitalityStartedAsCT = matchData.rounds.length > 0 && 
    matchData.rounds[0].events.some(event => 
      event.type === 'kill' && 
      event.player && 
      matchData.teams.Vitality.players.some(p => p.name === event.player) && 
      matchData.rounds[0].winner === 'CT'
    );

  // Calculate cumulative scores for the line chart
  const cumulativeScores = matchData.rounds.reduce((acc, round, index) => {
    // First round
    if (index === 0) {
      const vitalitySide = vitalityStartedAsCT ? 'CT' : 'T';
      const naviSide = vitalityStartedAsCT ? 'T' : 'CT';
      const vitalityWon = vitalitySide === round.winner;

      return [{
        round: 1,
        Vitality: vitalityWon ? 1 : 0,
        NAVI: vitalityWon ? 0 : 1,
        vitalitySide,
        naviSide,
      }];
    } 
    // Subsequent rounds
    else {
      const prev = acc[acc.length - 1];
      const isAfterHalftime = round.number > 15;
      
      // Teams switch sides after round 15
      const vitalitySide = isAfterHalftime ? 
        (vitalityStartedAsCT ? 'T' : 'CT') : 
        (vitalityStartedAsCT ? 'CT' : 'T');
      
      const naviSide = isAfterHalftime ? 
        (vitalityStartedAsCT ? 'CT' : 'T') : 
        (vitalityStartedAsCT ? 'T' : 'CT');
      
      // Determine which team won the round
      const vitalityWon = vitalitySide === round.winner;
      
      acc.push({
        round: round.number,
        Vitality: prev.Vitality + (vitalityWon ? 1 : 0),
        NAVI: prev.NAVI + (vitalityWon ? 0 : 1),
        vitalitySide,
        naviSide,
        halftime: round.number === 15 ? 'Halftime' : '',
      });
      
      return acc;
    }
  }, [] as any[]);

  // for color for the dots on the line chart 
  const vitalityStyle = {
    firstHalf: vitalityStartedAsCT ? TEAM_COLORS.CT : TEAM_COLORS.T,
    secondHalf: vitalityStartedAsCT ? TEAM_COLORS.T : TEAM_COLORS.CT
  };
  
  const naviStyle = {
    firstHalf: vitalityStartedAsCT ? TEAM_COLORS.T : TEAM_COLORS.CT,
    secondHalf: vitalityStartedAsCT ? TEAM_COLORS.CT : TEAM_COLORS.T
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div>
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {matchData.teams.Vitality.name} vs {matchData.teams.navi.name}
          </h1>
          <div className="flex items-center text-gray-400 text-sm">
            <span className="mr-4">Map: <span className="font-medium text-white">{matchData.map}</span></span>
            <span className="mr-4">Date: <span className="font-medium text-white">{new Date(matchData.date).toLocaleDateString()}</span></span>
            <span>Duration: <span className="font-medium text-white">{matchData.duration}</span></span>
          </div>
        </header>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
          <div className="flex justify-between items-center">
            <div className="text-center">
              <img
                src={vitalityLogo}
                alt="Team Vitality Logo"
                className="mx-auto mb-2 w-16 h-16 object-contain"
              />
              <h2 className="text-xl font-semibold mb-2">{matchData.teams.Vitality.name}</h2>
              <p className="text-5xl font-bold">{matchData.teams.Vitality.score}</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold mb-2">VS</div>
              <div className="text-sm text-gray-400">
                Winner: <span className="font-bold text-green-400">{matchData.winner}</span>
              </div>
            </div>
            <div className="text-center">
              <img
                src={naviLogo}
                alt="Navi Logo"
                className="mx-auto mb-2 w-16 h-16 object-contain"
              />
              <h2 className="text-xl font-semibold mb-2">{matchData.teams.navi.name}</h2>
              <p className="text-5xl font-bold">{matchData.teams.navi.score}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex border-b border-gray-700 mb-6">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`py-2 px-4 transition-colors duration-150 ${
                  selectedTab === tab.key
                    ? 'border-b-2 border-blue-500 text-blue-400 font-semibold'
                    : 'text-gray-400 hover:text-blue-300'
                }`}
                onClick={() => setSelectedTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {selectedTab === 'overview' && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Round Wins</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === 'T' ? TEAM_COLORS.T : TEAM_COLORS.CT} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Average time per round</h3>
                    <div className="h-64 flex items-center justify-center text-3xl font-bold">
                      {matchData.averageMatchTime} 
                    </div>
                  </div>

                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Top Utility Throwers</h3>
                    <div className="h-64 flex items-end justify-center">
                      {podium.map((player, index) => {
                        // calc position (1st, 2nd, 3rd)
                        const position = podium.length - index;
                        
                        // Height calc
                        const height = 100 - ((position - 1) * 30);
                        
                        return (
                          <div key={player.steamId} className="mx-3 flex flex-col items-center">
                            <div className="text-lg font-bold mb-1">
                              {player.utilThrown || 0}
                            </div>
                            <div 
                              style={{ 
                                height: `${height}px`, 
                                width: '60px', 
                                backgroundColor: player.team === 'T' ? TEAM_COLORS.T : TEAM_COLORS.CT 
                              }}
                              className="rounded-t-md flex justify-center items-end pb-1"
                            >
                              {position}
                            </div>
                            <div className="mt-2 text-center w-16 truncate">
                              {player.name && player.name.length > 8 
                                ? player.name.substring(0, 8) + '...' : player.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>


                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Most kills by players</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={playerKillsData.slice(0, 5)}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={80} />
                        <Tooltip />
                        <Bar dataKey="kills" fill="#8884d8">
                          {playerKillsData.slice(0, 5).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.team === 'T' ? TEAM_COLORS.T : TEAM_COLORS.CT} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Score Progression</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={cumulativeScores}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="round" />
                      <YAxis />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const roundData = cumulativeScores.find(r => r.round === label);
                            if (!roundData) return null;
                            
                            return (
                              <div className="bg-gray-800 p-2 border border-gray-700 rounded">
                                <p className="text-white font-medium">{`Round ${label}`}</p>
                                {label === 15 ? 
                                  <p className="text-orange-400 font-medium">Halftime - Teams Swap Sides</p> : null}
                                <p className="text-sm">{`${matchData.teams.Vitality.name}: ${payload[0].value}`}</p>
                                <p className="text-sm">{`${matchData.teams.navi.name}: ${payload[1].value}`}</p>
                                <p className="text-xs text-gray-400">
                                  {`${matchData.teams.Vitality.name} (${roundData.vitalitySide}) vs ${matchData.teams.navi.name} (${roundData.naviSide})`}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      
                      {/* Line to show halftime */}
                      <ReferenceLine 
                        x={15.5} 
                        stroke="#FF6347" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        label={{ 
                          value: 'HALFTIME - TEAMS SWAP SIDES', 
                          position: 'top', 
                          fill: '#FF6347',
                          fontSize: 12,
                          fontWeight: 'bold',
                        }} 
                      />
                      
                      {/* Team score lines with dots that change color at halftime */}
                      <Line 
                        name={matchData.teams.Vitality.name}
                        dataKey="Vitality"
                        strokeWidth={2}
                        stroke="#FFD700"
                        connectNulls
                        dot={(props) => {
                          // Custom dot component that changes color based on side
                          const { cx, cy, payload } = props;
                          const fill = payload.round <= 15 ? vitalityStyle.firstHalf : vitalityStyle.secondHalf;
                          return (
                            <circle 
                              cx={cx} 
                              cy={cy} 
                              r={4} 
                              fill={fill} 
                              stroke="#333" 
                              strokeWidth={1} 
                            />
                          );
                        }}
                      />
                      <Line 
                        name={matchData.teams.navi.name}
                        dataKey="NAVI" 
                        strokeWidth={2}
                        stroke="#1E90FF"
                        connectNulls
                        dot={(props) => {
                          // Custom dot component that changes color based on side
                          const { cx, cy, payload } = props;
                          const fill = payload.round <= 15 ? naviStyle.firstHalf : naviStyle.secondHalf;
                          return (
                            <circle 
                              cx={cx} 
                              cy={cy} 
                              r={4} 
                              fill={fill} 
                              stroke="#333" 
                              strokeWidth={1} 
                            />
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center mt-2 text-sm">
                  <div className="flex items-center mr-4">
                    <div className="w-3 h-3 rounded-full bg-yellow-400 mr-1"></div>
                    <span>T Side</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-400 mr-1"></div>
                    <span>CT Side</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'players' && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-yellow-400">{matchData.teams.Vitality.name} Players</h3>
                  <PlayerStats players={matchData.teams.Vitality.players} teamColor={TEAM_COLORS.T} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-blue-400">{matchData.teams.navi.name} Players</h3>
                  <PlayerStats players={matchData.teams.navi.players} teamColor={TEAM_COLORS.CT} />
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'rounds' && (
            <RoundHistory rounds={matchData.rounds} />
          )}

          {selectedTab === 'weapons' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Top Weapons Used</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topWeaponsData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={80} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8">
                        {topWeaponsData.map((_any, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Weapon Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topWeaponsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {topWeaponsData.map((_any, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchDashboard;