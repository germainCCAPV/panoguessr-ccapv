import { defineStore } from 'pinia'

export const MAX_ROUNDS = 5;

export const useRoundStore = defineStore('round', {
    state: () => ({
        round: 1,
        // Points obtenus à chaque manche (index 0 = manche 1).
        scores: [] as number[],
    }),
    getters: {
        // Total de la partie en cours.
        score: (state): number => state.scores.reduce((total, points) => total + points, 0),
    },
    actions: {
        nextRound() {
            this.round += 1;
        },
        // Enregistre le score de la manche en cours.
        // Idempotent : recharger la page résultat ne compte pas deux fois.
        setRoundScore(points: number) {
            this.scores[this.round - 1] = points;
        },
        reset() {
            this.scores = [];
            this.round = 1;
        },
    },
})
