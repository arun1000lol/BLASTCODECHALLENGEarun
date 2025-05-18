"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSGOLogParser = void 0;
const fs_1 = __importDefault(require("fs"));
class CSGOLogParser {
    constructor(filePath) {
        this.matchData = {};
        this.players = new Map();
        this.rounds = [];
        this.currentRound = null;
        this.startTime = null;
        this.endTime = null;
        this.roundStartTime = null;
        this.killEvents = [];
        this.damageEvents = [];
        this.utilEvents = [];
        this.regex = {
            // thank god for AI being so good with regex
            map: /Match_Start" on "([^"]+)"/,
            playerConnect: /"([^"]+)<(\d+)><[^>]+><[^>]*>" connected/,
            playerTeam: /"([^"]+)<(\d+)><[^>]+>(?:<[^>]*>)?" switched from team <[^>]+> to <([^>]+)>/,
            // playerkill regex works now but took a while to get right.
            playerKill: /"([^"<]+?)\s*<(\d+)><[^>]+><([^>]*)>".*killed\s+"([^"<]+?)\s*<(\d+)><[^>]+><([^>]*)>".*with\s+"([^"]+)"(?:\s+\(([^)]+)\))?/i,
            playerAssist: /"([^"<]+?)\s*<(\d+)><[^>]+><([^>]*)>" assisted killing "([^"<]+?)\s*<(\d+)><[^>]+><([^>]*)>"/,
            roundStart: /World triggered "Round_Start"/,
            roundEnd: /World triggered "Round_End"/,
            ctWin: /Team "CT" triggered "([^"]+)" \(CT "(\d+)"\) \(T "(\d+)"\)/,
            tWin: /Team "TERRORIST" triggered "([^"]+)" \(CT "(\d+)"\) \(T "(\d+)"\)/,
            matchStatus: /MatchStatus: Team playing "([^"]+)": (.+)/,
            bombPlanted: /"([^"]+)<(\d+)><[^>]+><[^>]+>" triggered "Planted_The_Bomb"/,
            bombDefused: /"([^"]+)<(\d+)><[^>]+><[^>]+>" triggered "Defused_The_Bomb"/,
            bombExploded: /World triggered "Bomb_Exploded"/,
            matchEnd: /Game Over: ([^$]+)/,
            playerDamage: /"([^"]+)<(\d+)><[^>]+><([^>]+)>".*attacked "([^"]+)<(\d+)><[^>]+><([^>]+)>".*with "([^"]+)" \(damage "(\d+)"\)/,
            timestamp: /^(\d+\/\d+\/\d+)\s+-\s+(\d+:\d+:\d+):/,
            faceitScore: /\[FACEIT\^]\s+([^\[]+)\s*\[(\d+)\s*-\s*(\d+)\]/,
            utilThrown: /"([^"<]+?)\s*<.*>" threw (\w+)/,
            matchDate: /^(\d{1,2}\/\d{1,2}\/\d{4})/,
        };
        this.filePath = filePath;
    }
    async parseFile() {
        // init a matchdata obj for later storing data
        this.matchData = {
            map: '',
            date: new Date().toISOString(), // TODO UPDATE DATE TO MATCH DATE
            teams: {
                navi: { name: 'NAVI', score: 0, players: [] },
                Vitality: { name: 'Vitality', score: 0, players: [] }
            },
            rounds: [],
            totalRounds: 0,
            duration: '0h 0m',
            winner: ''
        };
        // Keep track of which team is playing as CT/T 
        let ctTeam = '';
        let tTeam = '';
        return new Promise((resolve, reject) => {
            // tried to use highwatermark so it reads more per chunk for better performance
            const stream = fs_1.default.createReadStream(this.filePath, {
                encoding: 'utf8',
                highWaterMark: 1024 * 1024 // 1MB chunks
            });
            // buffer to temporarily store data
            let buffer = '';
            stream.on('data', (chunk) => {
                buffer += chunk;
                const lines = buffer.split('\n');
                // Keep any partial line in the buffer
                buffer = lines.pop() || '';
                for (const line of lines) {
                    // see who plays on t or ct
                    const matchStatus = line.match(this.regex.matchStatus);
                    if (matchStatus) {
                        if (matchStatus[1] === 'CT') {
                            ctTeam = matchStatus[2].trim();
                        }
                        else if (matchStatus[1] === 'TERRORIST') {
                            tTeam = matchStatus[2].trim();
                        }
                    }
                    this.processRegexLine(line);
                }
            });
            stream.on('end', () => {
                // Process any remaining buffer
                if (buffer.length > 0) {
                    this.processRegexLine(buffer);
                }
                // run the m,ethods
                this.processKillsAndDamage();
                this.processUtilThrown();
                // store the last round
                if (this.currentRound) {
                    this.rounds.push(this.currentRound);
                }
                // Calculate final stats 
                this.calculateStats();
                this.fixPlayerTeams();
                // update match data to matchdata interface
                this.matchData.rounds = this.rounds;
                this.matchData.totalRounds = this.rounds.length;
                this.matchData.duration = this.getDuration();
                resolve(this.matchData);
            });
            stream.on('error', (err) => {
                console.error("Failed to read log file:", err);
                reject(err);
            });
        });
    }
    // this method does most of the work - checks each line against all regex patterns
    // this also updates all of the matchdata and player data, so this is pretty essential.
    // there is a very apparent performance issue though.
    processRegexLine(line) {
        // timestamp handling - careful to track start/end times
        const timeMatch = line.match(this.regex.timestamp);
        if (timeMatch) {
            const timestamp = `${timeMatch[1]} ${timeMatch[2]}`;
            if (!this.startTime) {
                this.startTime = timestamp; // First timestamp in file
            }
            this.endTime = timestamp; // to update to latest timestamp
        }
        // map info 
        const mapMatch = line.match(this.regex.map);
        if (mapMatch) {
            this.matchData.map = mapMatch[1];
        }
        // match date very simple regex.
        const matchDate = line.match(this.regex.matchDate);
        if (matchDate) {
            this.matchData.date = matchDate[1];
        }
        // for when plaeyr connects so we can give them teams and track them
        const connectMatch = line.match(this.regex.playerConnect);
        if (connectMatch) {
            const id = connectMatch[2];
            const name = connectMatch[1];
            // to only add new players that havent been added yet
            if (!this.players.has(id)) {
                this.players.set(id, {
                    steamId: id,
                    name: name,
                    team: 'Unknown',
                    kills: 0,
                    deaths: 0,
                    assists: 0,
                    headshots: 0,
                    damage: 0,
                    adr: 0,
                    kast: 0,
                    rating: 0,
                    weapons: {},
                    // TODO: add more stats here
                });
            }
        }
        // faceit score tracking
        // did this in a different way first, where the regex tracked when a new round started. 
        // but this is more consistent and easier cause the faceit admin tells when the score changes
        const scoreMatch = line.match(this.regex.faceitScore);
        if (scoreMatch && this.matchData.teams) {
            this.matchData.teams.navi.score = parseInt(scoreMatch[2]);
            this.matchData.teams.Vitality.score = parseInt(scoreMatch[3]);
        }
        // track player team changes cause half time and stuff
        const teamMatch = line.match(this.regex.playerTeam);
        if (teamMatch) {
            const name = teamMatch[1];
            const id = teamMatch[2];
            const team = teamMatch[3];
            // create player if they dont exist yet
            let player = this.players.get(id);
            if (!player) {
                player = {
                    steamId: id,
                    name: name,
                    team: 'Unknown',
                    kills: 0,
                    deaths: 0,
                    assists: 0,
                    headshots: 0,
                    damage: 0,
                    adr: 0,
                    kast: 0,
                    rating: 0,
                    weapons: {}
                };
                this.players.set(id, player);
            }
            // team updater
            if (team === 'TERRORIST') {
                player.team = 'T';
            }
            else if (team === 'CT') {
                player.team = 'CT';
            }
            else {
                player.team = 'Unknown';
            }
        }
        // round start - begin tracking a new round for time
        if (line.match(this.regex.roundStart)) {
            // save previous round if it exists
            if (this.currentRound) {
                this.rounds.push(this.currentRound);
            }
            // start tracking a new round
            const time = this.getTimestamp(line);
            this.roundStartTime = time; // save info
            // calculate average time per round
            const avgMatchTime = this.getAverageRoundTime();
            this.matchData.averageMatchTime = avgMatchTime;
            // currentround info
            this.currentRound = {
                number: this.rounds.length + 1,
                winner: 'T',
                winReason: '',
                tScore: 0,
                ctScore: 0,
                duration: 0,
                events: [{
                        type: 'round_start',
                        time: time || ''
                    }]
            };
        }
        // round end - for round time tracking
        if (line.match(this.regex.roundEnd) && this.currentRound) {
            const time = this.getTimestamp(line);
            // calculate round duration
            if (this.roundStartTime && time) {
                const start = this.parseTime(this.roundStartTime);
                const end = this.parseTime(time);
                if (start && end) {
                    // convert ms to seconds
                    this.currentRound.duration = Math.floor((end.getTime() - start.getTime()) / 1000);
                }
            }
            // add round end event
            if (this.currentRound.events) {
                this.currentRound.events.push({
                    type: 'round_end',
                    time: time || ''
                });
            }
            // Reset for next round
            this.roundStartTime = null;
        }
        // handle CT win conditions
        const ctWin = line.match(this.regex.ctWin);
        if (ctWin && this.currentRound) {
            this.currentRound.winner = 'CT';
            this.currentRound.winReason = ctWin[1]; // e.g. "CTs_Win", "Target_Saved", etc
            this.currentRound.ctScore = parseInt(ctWin[2]);
            this.currentRound.tScore = parseInt(ctWin[3]);
        }
        // handle T win conditions
        const tWin = line.match(this.regex.tWin);
        if (tWin && this.currentRound) {
            this.currentRound.winner = 'T';
            this.currentRound.winReason = tWin[1];
            this.currentRound.ctScore = parseInt(tWin[2]);
            this.currentRound.tScore = parseInt(tWin[3]);
        }
        // handle kills - for scoreboard
        const kill = line.match(this.regex.playerKill);
        if (kill) {
            // store all info about the kill
            this.killEvents.push({
                killerId: kill[2],
                killerName: kill[1],
                killerTeam: kill[3],
                victimId: kill[5],
                victimName: kill[4],
                victimTeam: kill[6],
                weapon: kill[7],
                headshot: kill[8] === 'headshot',
                time: this.getTimestamp(line)
            });
            // also add to current round events
            if (this.currentRound && this.currentRound.events) {
                this.currentRound.events.push({
                    type: 'kill',
                    time: this.getTimestamp(line) || '',
                    player: kill[1], // killer
                    target: kill[4], // victim
                    weapon: kill[7],
                    headshot: kill[8] === 'headshot'
                });
            }
        }
        // track assists separately
        const assistMatch = line.match(this.regex.playerAssist);
        if (assistMatch) {
            const assisterId = assistMatch[2];
            const assisterName = assistMatch[1];
            const targetId = assistMatch[5];
            const targetName = assistMatch[4];
            // get or create the assister
            let assister = this.players.get(assisterId);
            if (!assister) {
                // ensure player isnt undefined if so it creates a player
                assister = {
                    steamId: assisterId,
                    name: assisterName,
                    team: assistMatch[3] === 'TERRORIST' ? 'T' : assistMatch[3] === 'CT' ? 'CT' : 'Unknown',
                    kills: 0,
                    deaths: 0,
                    assists: 0,
                    headshots: 0,
                    damage: 0,
                    adr: 0,
                    kast: 0,
                    rating: 0,
                    weapons: {}
                };
                this.players.set(assisterId, assister);
            }
            // count the assist
            assister.assists = (assister.assists || 0) + 1;
            // add assist to round
            // for showing score each round.
            if (this.currentRound && this.currentRound.events) {
                this.currentRound.events.push({
                    type: 'assist',
                    time: this.getTimestamp(line) || '',
                    player: assisterName,
                    target: targetName
                });
            }
        }
        // bomb plant tracking
        // this is done in a way i dont like. 
        // it stores both when bomb is planted, when bomb is defused and when bomb exploded.
        // think there is a better way for a single regex that does all 3
        const bombPlanted = line.match(this.regex.bombPlanted);
        if (bombPlanted && this.currentRound && this.currentRound.events) {
            this.currentRound.events.push({
                type: 'bomb_planted',
                time: this.getTimestamp(line) || '',
                player: bombPlanted[1]
            });
        }
        const bombDefused = line.match(this.regex.bombDefused);
        if (bombDefused && this.currentRound && this.currentRound.events) {
            this.currentRound.events.push({
                type: 'bomb_defused',
                time: this.getTimestamp(line) || '',
                player: bombDefused[1]
            });
        }
        if (line.match(this.regex.bombExploded) && this.currentRound && this.currentRound.events) {
            this.currentRound.events.push({
                type: 'bomb_exploded',
                time: this.getTimestamp(line) || ''
            });
        }
        // track dmg for adr
        const damage = line.match(this.regex.playerDamage);
        if (damage) {
            this.damageEvents.push({
                attackerId: damage[2],
                damage: parseInt(damage[8])
            });
        }
        // added tracking for utility thrown
        const utilThrown = line.match(this.regex.utilThrown);
        if (utilThrown) {
            const playerName = utilThrown[1];
            const utilType = utilThrown[2];
            this.utilEvents.push({
                playerName: playerName, // name to see who threw the util
                utilType: utilType
            });
        }
        // match end and calc the winner 
        const matchEnd = line.match(this.regex.matchEnd);
        if (matchEnd) {
            // winner based off score. could also do regex for when faceit says who won
            if (this.matchData.teams) {
                const naviScore = this.matchData.teams.navi.score || 0;
                const vitalityScore = this.matchData.teams.Vitality.score || 0;
                // done in a funny way that just looks who has the higher score at the end.
                // could also the first one who gets 16 rounds. would not work if there is overtime(which there will be in other matches than this)
                if (naviScore > vitalityScore) {
                    this.matchData.winner = this.matchData.teams.navi.name;
                }
                else {
                    this.matchData.winner = this.matchData.teams.Vitality.name;
                }
            }
        }
    }
    // proces util throws, did it a bad way cause i am tracking steamids
    processUtilThrown() {
        // map of player names for tracking who throws what util
        const playerNameMap = new Map();
        this.players.forEach((player, id) => {
            if (player.name) {
                playerNameMap.set(player.name.toLowerCase(), id);
            }
        });
        // Now process all the util events
        for (const util of this.utilEvents) {
            // find player by name
            const playerId = playerNameMap.get(util.playerName.toLowerCase());
            if (playerId) {
                let player = this.players.get(playerId);
                if (player) {
                    // do || 0 so no NaN
                    player.utilThrown = (player.utilThrown || 0) + 1;
                }
            }
        }
        // console.log("Top util throwers:");
        // this.players.forEach(p => {
        //   if (p.utilThrown && p.utilThrown > 5) {
        //     console.log(`${p.name}: ${p.utilThrown}`);
        //   }
        // });
    }
    // process all the kills and damage 
    processKillsAndDamage() {
        for (const kill of this.killEvents) {
            // handle the killer stats
            let killer = this.players.get(kill.killerId);
            if (!killer) {
                // create player if they dont exist yet. made errors when it wasnt here
                killer = {
                    steamId: kill.killerId,
                    name: kill.killerName,
                    team: kill.killerTeam === 'TERRORIST' ? 'T' : kill.killerTeam === 'CT' ? 'CT' : 'Unknown',
                    kills: 0,
                    deaths: 0,
                    assists: 0,
                    headshots: 0,
                    damage: 0,
                    adr: 0,
                    kast: 0,
                    rating: 0,
                    weapons: {}
                };
                this.players.set(kill.killerId, killer);
            }
            // update the killer's stats
            killer.kills = (killer.kills || 0) + 1;
            if (kill.headshot) { // headshots for HS%
                killer.headshots = (killer.headshots || 0) + 1;
            }
            // track weapon usage
            if (!killer.weapons)
                killer.weapons = {};
            if (!killer.weapons[kill.weapon]) {
                killer.weapons[kill.weapon] = 1;
            }
            else {
                killer.weapons[kill.weapon]++;
            }
            // update the victim's stats
            let victim = this.players.get(kill.victimId);
            if (!victim) {
                victim = {
                    steamId: kill.victimId,
                    name: kill.victimName,
                    team: kill.victimTeam === 'TERRORIST' ? 'T' : kill.victimTeam === 'CT' ? 'CT' : 'Unknown',
                    kills: 0,
                    deaths: 0,
                    assists: 0,
                    headshots: 0,
                    damage: 0,
                    adr: 0,
                    kast: 0,
                    rating: 0,
                    weapons: {}
                };
                this.players.set(kill.victimId, victim);
            }
            // deaths counter
            victim.deaths = (victim.deaths || 0) + 1;
        }
        const damageByPlayer = new Map();
        for (const dmg of this.damageEvents) {
            // sum up damage by attacker ID
            if (!damageByPlayer.has(dmg.attackerId)) {
                damageByPlayer.set(dmg.attackerId, dmg.damage);
            }
            else {
                damageByPlayer.set(dmg.attackerId, damageByPlayer.get(dmg.attackerId) + dmg.damage);
            }
        }
        // apply the damage totals to each player
        for (const [id, dmg] of damageByPlayer.entries()) {
            const player = this.players.get(id);
            if (player) {
                player.damage = (player.damage || 0) + dmg;
            }
        }
    }
    // calculate stats for each player and store them
    calculateStats() {
        const numRounds = this.rounds.length;
        this.players.forEach(p => {
            // adr calculation
            if (numRounds > 0) {
                p.adr = (p.damage || 0) / numRounds;
            }
            else {
                p.adr = 0;
            }
            // KAST
            p.kast = Math.max(0, Math.min(100, 70 + (p.kills || 0) * 0.5 - (p.deaths || 0) * 0.3));
            // kdr calculation by deaths and kills
            let kdr = 0;
            if ((p.deaths || 0) > 0) {
                kdr = (p.kills || 0) / (p.deaths || 0);
            }
            else if ((p.kills || 0) > 0) {
                kdr = p.kills ?? 0; // If no deaths but some kills, use kills as KDR
            }
            // impact 
            let impact = 0;
            if (numRounds > 0) {
                impact = ((p.kills || 0) * 0.7 + (p.headshots || 0) * 0.3) / numRounds;
            }
            // rating calculation
            p.rating = (0.3 * kdr + 0.7 * impact) * (1 + (p.kast || 0) / 100);
        });
    }
    // assign players to the right teams based on name matching
    fixPlayerTeams() {
        if (!this.matchData.teams)
            return;
        // known rosters. I dont like this cause its hardcoded, meaning if we try with other csgo logs the player part wont show.
        // unless we change it to a more generic way of doing it
        const naviRoster = ['s1mple', 'electronic', 'boombl4', 'b1t', 'perfecto'];
        const vitalityRoster = ['zywoo', 'apex', 'misutaaa', 'kyojin', 'shox'];
        // clear player teams
        this.matchData.teams.navi.players = [];
        this.matchData.teams.Vitality.players = [];
        const naviPlayers = new Map();
        const vitalityPlayers = new Map();
        for (const player of this.players.values()) {
            if (!player.name)
                continue;
            const lowerName = player.name.toLowerCase();
            // navi roster
            for (const roster of naviRoster) {
                if (lowerName.includes(roster.toLowerCase())) {
                    const current = naviPlayers.get(roster);
                    if (!current || (player.kills || 0) > (current.kills || 0)) {
                        naviPlayers.set(roster, player);
                    }
                    break;
                }
            }
            // vitality roster 
            for (const roster of vitalityRoster) {
                if (lowerName.includes(roster.toLowerCase())) {
                    const current = vitalityPlayers.get(roster);
                    if (!current || (player.kills || 0) > (current.kills || 0)) {
                        vitalityPlayers.set(roster, player);
                    }
                    break;
                }
            }
        }
        // add players to teams
        for (const player of naviPlayers.values()) {
            if (player) {
                this.matchData.teams.navi.players.push(player);
            }
        }
        for (const player of vitalityPlayers.values()) {
            if (player) {
                this.matchData.teams.Vitality.players.push(player);
            }
        }
        // sort players 
        this.matchData.teams.navi.players.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        this.matchData.teams.Vitality.players.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    // helper methdo to get the timestamp from regex line
    getTimestamp(line) {
        const match = line.match(this.regex.timestamp);
        if (match) {
            return `${match[1]} ${match[2]}`;
        }
        return null;
    }
    // parse a timestamp string into a Date object
    parseTime(ts) {
        if (!ts)
            return null;
        const parts = ts.split(' ');
        if (parts.length !== 2)
            return null;
        const date = parts[0];
        const time = parts[1];
        // parse date parts
        const dateParts = date.split('/');
        if (dateParts.length !== 3)
            return null;
        const month = dateParts[0];
        const day = dateParts[1];
        const year = dateParts[2];
        return new Date(`${year}-${month}-${day}T${time}`);
    }
    // calc total match duration
    getDuration() {
        if (!this.startTime || !this.endTime) {
            return '0h 0m';
        }
        const start = this.parseTime(this.startTime);
        const end = this.parseTime(this.endTime);
        if (!start || !end) {
            return '0h 0m';
        }
        // calc hrs and mins
        const diff = end.getTime() - start.getTime();
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${mins}m`;
    }
    // Calculate average round time
    getAverageRoundTime() {
        if (this.rounds.length === 0) {
            return '0:00'; // Default if no rounds
        }
        // sum all rounds for avg
        const totalDurationSeconds = this.rounds.reduce((sum, { duration = 0 }) => sum + duration, 0);
        const avgSeconds = totalDurationSeconds / this.rounds.length;
        // format in secs and mins
        const minutes = Math.floor(avgSeconds / 60);
        const seconds = Math.round(avgSeconds % 60);
        // to make the string a little nicer
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}
exports.CSGOLogParser = CSGOLogParser;
