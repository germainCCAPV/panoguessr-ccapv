import {Peer} from "crossws";
import {haversineDistance} from "~~/server/api/end-game.post";
import {gameState, Game, Guess} from "~~/server/utils/gameState";
import { getPanoramaxPictureIDs } from "~/utils/panoramax";

function createGameId(): string {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function createPlayerId(): string {
    return Math.random().toString(36).substring(2, 10);
}

async function handleCreateGame(peer: Peer, username: string, mode: GameMode = 'classic') {
    const gameId = createGameId();
    const playerId = createPlayerId();
    const player = { id: playerId, username };

    try {
        // Pool large : jusqu'à 20 joueurs possibles en élimination
        const nbLocations = mode === 'elimination' ? 19 : 5;
        const pictures = await getPanoramaxPictureIDs(nbLocations);
        const game: Game = {
            id: gameId,
            status: 'waiting',
            mode,
            players: [player],
            activePlayers: [player],
            eliminations: [],
            locations: pictures.map(p => p.id),
            totalRounds: 5,
            currentRound: 0,
            guesses: {},
            realPositions: pictures.map(p => p.position)
        };
        // ... le reste inchangé

        gameState.setGame(gameId, game);
        peer.subscribe(`game:${gameId}`);

        peer.send(JSON.stringify({
            action: 'gameCreated',
            gameId,
            playerId,
            players: game.players
        }));
    } catch (error) {
        peer.send(JSON.stringify({
            action: 'error',
            message: 'Failed to create game'
        }));
    }
}

function handleJoinGame(peer: Peer, gameId: string, username: string) {
    const game = gameState.getGame(gameId);

    if (!game || game.status !== 'waiting') {
        peer.send(JSON.stringify({
            action: 'error',
            message: 'Game not found or already started'
        }));
        return;
    }

    const playerId = createPlayerId();
    const player = { id: playerId, username };
        game.players.push(player);
    game.activePlayers.push(player);

    peer.send(JSON.stringify({
        action: 'joined',
        gameId,
        playerId,
        players: game.players
    }));

    peer.subscribe(`game:${gameId}`);
    peer.publish(`game:${gameId}`, JSON.stringify({
        action: 'playerListUpdated',
        players: game.players
    }));

    gameState.setGame(gameId, game);
}

function handleStartGame(peer: Peer, gameId: string) {
    const game = gameState.getGame(gameId);
    if (!game || game.status !== 'waiting') return;

    if (game.mode === 'elimination') {
        if (game.players.length < 2) {
            peer.send(JSON.stringify({ action: 'error', message: 'Il faut au moins 2 joueurs pour ce mode' }));
            return;
        }
        game.totalRounds = game.players.length - 1;
    }

    game.status = 'active';
    gameState.setGame(gameId, game);

    peer.send(JSON.stringify({
        action: 'gameStarted',
        locationId: game.locations[0],
        mode: game.mode,
        totalRounds: game.totalRounds
    }));

    peer.publish(`game:${gameId}`, JSON.stringify({
        action: 'gameStarted',
        locationId: game.locations[0],
        mode: game.mode,
        totalRounds: game.totalRounds
    }));
}

async function handleGuess(peer: Peer, gameId: string, playerId: string, guessPosition: { lat: number; lng: number }) {
    // Ignorer les guesses des joueurs éliminés
    const isActive = game.activePlayers.some(p => p.id === playerId);
    if (!isActive) return;
    const game = gameState.getGame(gameId);
    if (!game || game.status !== 'active') return;

    if (!game.guesses[game.currentRound]) {
        game.guesses[game.currentRound] = [];
    }

    const existingGuessIndex = game.guesses[game.currentRound].findIndex(g => g.playerId === playerId);
    if (existingGuessIndex !== -1) {
        return;
    }

    const guess: Guess = {
        playerId,
               position: {
            lat: guessPosition.latitude,
            lng: guessPosition.longitude
        }
    };

    game.guesses[game.currentRound].push(guess);

    peer.publish(`game:${gameId}`, JSON.stringify({
        action: 'newGuess',
        playerId,
        guess
    }));

    
        const allPlayersGuessed = game.activePlayers.length === game.guesses[game.currentRound].length;

    if (allPlayersGuessed) {
        try {
            // Scores du round (code de roundScores déjà en place)
            const pointsForDistance = (d: number) => Math.round(5000 * Math.exp(-d / 6000));
            const roundScores = game.guesses[game.currentRound].map(guess => {
                const real = game.realPositions[game.currentRound];
                const distance = haversineDistance(
                    { lat: guess.position.lat, lng: guess.position.lng },
                    real
                );
                return {
                    playerId: guess.playerId,
                    distance: Math.round(distance),
                    points: Number.isFinite(distance) ? pointsForDistance(distance) : 0
                };
            });

            let eliminatedId: string | null = null;

            if (game.mode === 'elimination') {
                // Le plus loin est éliminé
                const worst = [...roundScores].sort((a, b) => b.distance - a.distance)[0];
                eliminatedId = worst.playerId;
                game.activePlayers = game.activePlayers.filter(p => p.id !== eliminatedId);
                game.eliminations.push({ playerId: eliminatedId, round: game.currentRound + 1 });
            }

            const isFinished = game.mode === 'elimination'
                ? game.activePlayers.length <= 1
                : game.currentRound + 1 >= game.totalRounds;

            const roundCompletePayload = JSON.stringify({
                action: 'roundComplete',
                guesses: game.guesses[game.currentRound],
                realPosition: game.realPositions[game.currentRound],
                roundScores,
                eliminatedId,                     // ← null en classic
                isFinished
            });
            peer.send(roundCompletePayload);
            peer.publish(`game:${gameId}`, roundCompletePayload);

            game.currentRound++;

            if (isFinished) {
                game.status = 'finished';
                gameState.setGame(gameId, game);
                setTimeout(() => {
                    const finishedPayload = JSON.stringify({ action: 'gameFinished', gameId });
                    peer.send(finishedPayload);
                    peer.publish(`game:${gameId}`, finishedPayload);
                }, 10000); // 10 s pour admirer le dernier round
                return;
            }

            const nextLocation = game.locations[game.currentRound];
            setTimeout(() => { /* votre nextLocation existant */ }, 7000);
        } catch (error) { /* ... */ }
    }

function handleDisconnect(peer: Peer) {
    const games = gameState.getAllGames();
    games.forEach((game, gameId) => {
        game.players = game.players.filter(player =>
          peer.id !== `game:${gameId}:${player.id}`
        );
        gameState.setGame(gameId, game);
        peer.publish(`game:${gameId}`, JSON.stringify({
            action: 'playerListUpdated',
            players: game.players
        }));
    });
}

export default defineWebSocketHandler({
    message(peer, message) {
        try {
            const data: any = message.json();

            switch (data.action) {
                case 'create':
    handleCreateGame(peer, data.username, data.mode === 'elimination' ? 'elimination' : 'classic');
    break;
                case 'join':
                    handleJoinGame(peer, data.gameId, data.username);
                    break;
                case 'start':
                    handleStartGame(peer, data.gameId);
                    break;
                case 'guess':
                    handleGuess(peer, data.gameId, data.playerId, data.guess);
                    break;
                case 'getScores':
                    const game = gameState.getGame(data.gameId);
                    if (game) {
                        const scores = gameState.calculateScores(data.gameId, haversineDistance);
                        peer.send(JSON.stringify({
                            action: 'scores',
                            scores
                        }));
                    } else {
                        peer.send(JSON.stringify({
                            action: 'error',
                            message: 'Game not found'
                        }));
                    }
                    break;
                case 'ping':
                    peer.send(JSON.stringify({ action: 'pong' }));
                    break;
                default:
                    peer.send(JSON.stringify({
                        action: 'error',
                        message: 'Invalid action'
                    }));
            }
        } catch (error) {
            console.error('Message handler error:', error);
            peer.send(JSON.stringify({
                action: 'error',
                message: 'Invalid message format'
            }));
        }
    },
    close(peer) {
        handleDisconnect(peer);
                game.players = game.players.filter(...);
        game.activePlayers = game.activePlayers.filter(player =>
          peer.id !== `game:${gameId}:${player.id}`
        );
    }
});
