import { GeoPoint } from '~~/types/geo';

export type Guess = {
  playerId: string;
  position: {
    lat: number;
    lng: number;
  };
  /** false si le joueur n'a pas cliqué (temps écoulé) */
  hasGuess: boolean;
  /** Distance au vrai lieu, en mètres. */
  distance: number;
  /** Temps retenu pour la manche, en secondes. */
  elapsedSeconds: number;
  /** Points gagnés grâce à la proximité. */
  distancePoints: number;
  /** Points perdus à cause du temps. */
  timePenalty: number;
  /** Score de la manche (distancePoints - timePenalty). */
  points: number;
};

export type Player = {
  id: string;
  username: string;
};

export type GameMode = 'classic' | 'elimination';

export type Game = {
  id: string;
  status: 'waiting' | 'active' | 'finished';
  mode: GameMode;                          // ← nouveau
  players: Player[];
  activePlayers: Player[];                 // ← joueurs encore en jeu
  eliminations: { playerId: string; round: number }[];  // ordre d'élimination
  guesses: { [round: number]: Guess[] };
  locations: string[];
  totalRounds: number;                     // ← dynamique au lieu de 5 fixe
  currentRound: number;
  /** Instant (ms) où la manche en cours a démarré côté serveur. */
  roundStartedAt?: number;
  realPositions: { [round: number]: { lat: number; lng: number } };
};

// La map des jeux
const games = new Map<string, Game>();

export const gameState = {
  /**
   * Récupère un jeu par son ID
   */
  getGame(gameId: string): Game | undefined {
    return games.get(gameId);
  },

  /**
   * Récupère tous les jeux
   */
  getAllGames(): Map<string, Game> {
    return games;
  },

  /**
   * Ajoute ou met à jour un jeu
   */
  setGame(gameId: string, game: Game): void {
    games.set(gameId, game);
  },

  /**
   * Supprime un jeu
   */
  removeGame(gameId: string): boolean {
    return games.delete(gameId);
  },

  /**
   * Calcule les scores pour un jeu
   */
calculateScores(gameId: string, haversineDistance: (p1: GeoPoint, p2: GeoPoint) => number) {
  const game = games.get(gameId);
  if (!game) return [];

  if (game.mode === 'elimination') {
    // Classement = le survivant gagne, puis les joueurs dans l'ordre inverse
    // de leur élimination (le dernier éliminé est 2e, le premier éliminé est dernier).
    // Pas de points dans ce mode : on affiche un libellé à la place.
    const ranking: Array<{position: number, player: string, score: number, label: string}> = [];

    const winner = game.activePlayers[0];
    if (winner) {
      ranking.push({ position: 1, player: winner.username, score: 0, label: 'Vainqueur' });
    }

    [...game.eliminations].reverse().forEach((elim, index) => {
      const player = game.players.find(p => p.id === elim.playerId);
      if (player) {
        ranking.push({
          position: index + 2,
          player: player.username,
          score: 0,
          label: `Éliminé manche ${elim.round}`
        });
      }
    });

    return ranking;
  }

  // Mode classique : somme des points de chaque manche.
  // Chaque score est calculé à l'arrivée du clic (voir handleGuess dans ws.ts,
  // règle dans app/utils/scoring.ts). Une manche sans clic vaut 0 point.
  const totals = new Map<string, number>(game.players.map(p => [p.id, 0]));

  Object.values(game.guesses).forEach(roundGuesses => {
    roundGuesses.forEach(guess => {
      if (totals.has(guess.playerId)) {
        totals.set(guess.playerId, (totals.get(guess.playerId) ?? 0) + (guess.points ?? 0));
      }
    });
  });

  const scoreArray = game.players
    .map(player => ({ player: player.username, score: totals.get(player.id) ?? 0, position: 0 }))
    .sort((a, b) => b.score - a.score); // tri DÉCROISSANT : plus de points = mieux

  scoreArray.forEach((item, index) => { item.position = index + 1; });
  return scoreArray;
},

/**
 * Total cumulé d'un joueur jusqu'à la manche donnée (incluse).
 */
totalUntilRound(game: Game, playerId: string, round: number): number {
  let total = 0;

  for (let r = 0; r <= round; r++) {
    const guess = (game.guesses[r] ?? []).find(g => g.playerId === playerId);
    total += guess?.points ?? 0;
  }

  return total;
}
};
