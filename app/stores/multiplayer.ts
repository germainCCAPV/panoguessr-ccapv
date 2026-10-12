import { defineStore } from 'pinia'
import { useRoundStore } from './round' // Import the second store

export interface Player {
    id: string
    username: string
}

export interface Guess {
    playerId: string
    latitude: number
    longitude: number
    distance?: number
    score?: number
}
export interface RoundScore {
    playerId: string;
    distance: number;
    points: number;
}

export interface MultiplayerStore {
    connected: boolean;
    gameId: string | null;
    playerId: string | null;
    players: Player[];
    currentLocationId: string | null;
    realLocation: { lat: number; lng: number } | null;
    guesses: Guess[];
    roundScores: RoundScore[];      // ← nouveau
    loading: boolean;
    error: string | null;
    mode: 'classic' | 'elimination';
    totalRounds: number;
    eliminatedPlayerId: string | null;
}

export const useMultiplayer = defineStore('multiplayer', {
    state: (): MultiplayerStore => ({
        connected: false,
        gameId: null,
        playerId: null,
        players: [],
        currentLocationId: null,
        realLocation: null,
        guesses: [],
        loading: false,
        error: null,
            mode: 'classic',
    totalRounds: null;
    eliminatedPlayerId: null;

    }),
    actions: {
        async initializeWebSocket() {
            try {
                const ws = new WebSocket(`${window.location.origin.replace('http', 'ws')}/api/ws`)

                ws.onopen = () => {
                    this.connected = true
                    this.error = null;

                    setInterval(() => {
                        ws.send(JSON.stringify({ action: 'ping' }))
                    }, 10000)
                }

                ws.onclose = () => {
                    this.connected = false
                }

                ws.onerror = () => {
                    this.error = 'WebSocket connection error'
                }

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data)
                    this.handleWebSocketMessage(data)
                }

                // Store WebSocket instance
                this.ws = ws

                return this
            } catch (error) {
                this.error = 'Failed to initialize WebSocket connection'
            }
        },

        handleWebSocketMessage(data: any) {
            const router = useRouter();
            const roundStore = useRoundStore();
            switch (data.action) {
                case 'gameCreated':
    this.gameId = data.gameId
    this.playerId = data.playerId
    this.players = data.players
    router.push('/lobby')     // ← nouveau
    break

case 'joined':
    this.gameId = data.gameId
    this.playerId = data.playerId
    this.players = data.players
    router.push('/lobby')     // ← nouveau
    break

                case 'playerListUpdated':
                    this.players = data.players
                    break

                case 'gameStarted':
    this.currentLocationId = data.locationId
    this.mode = data.mode || 'classic'
    this.totalRounds = data.totalRounds || 5
    this.guesses = []
    this.eliminatedPlayerId = null
    router.push('/multiplayer');
    break

                case 'nextLocation':
                    this.currentLocationId = data.locationId;
    this.guesses = [];
    this.roundScores = [];

                    if (roundStore.round === 5) {
                        roundStore.reset();
                        router.push(`/scoreboard/${this.gameId}`);
                    } else {
                        roundStore.nextRound();
                        router.push("/multiplayer");
                    }

                    break
                
                case 'roundComplete':
    this.realLocation = data.realPosition
    this.guesses = data.guesses || [];
    this.roundScores = data.roundScores || [];
    this.eliminatedPlayerId = data.eliminatedId || null;
    break;

                case 'newGuess':
                    this.guesses.push(data.guess)
                    break

                case 'error':
                    this.error = data.message
                    break

               

                case 'gameFinished':
    roundStore.reset();
    router.push(`/scoreboard/${this.gameId}`);
    break;
            }
        },

async createGame(username: string, mode: 'classic' | 'elimination' = 'classic') {
    this.loading = true
    try {
        this.ws?.send(JSON.stringify({ action: 'create', username, mode }))
    } catch (error) {
        this.error = 'Failed to create game'
    } finally {
        this.loading = false
    }
}

        async getScores(gameId: string) {
            this.loading = true
            try {
                this.ws?.send(JSON.stringify({
                    action: 'getScores',
                    gameId,
                }))
            } catch (error) {
                this.error = 'Failed to get score'
            } finally {
                this.loading = false
            }
        },

        async joinGame(gameId: string, username: string) {
            this.loading = true
            try {
                this.ws?.send(JSON.stringify({
                    action: 'join',
                    gameId,
                    username
                }))
            } catch (error) {
                this.error = 'Failed to join game'
            } finally {
                this.loading = false
            }
        },

        startGame() {
            if (!this.gameId) return

            try {
                this.ws?.send(JSON.stringify({
                    action: 'start',
                    gameId: this.gameId
                }))
            } catch (error) {
                this.error = 'Failed to start game'
            }
        },

        submitGuess(latitude: number, longitude: number) {
            if (!this.gameId) return

            const guess: Guess = {
                playerId: this.playerId, // .find(p => p.id)?.id ?? '',
                latitude,
                longitude
            }

            try {
                this.ws?.send(JSON.stringify({
                    action: 'guess',
                    gameId: this.gameId,
                    playerId: this.playerId,
                    guess
                }))
            } catch (error) {
                this.error = 'Failed to submit guess'
            }
        },

        reset() {
            this.gameId = null
            this.players = []
            this.currentLocationId = null
            this.guesses = []
            this.error = null
        }
    }
})
