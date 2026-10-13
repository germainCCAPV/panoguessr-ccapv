import { defineStore } from 'pinia'

export const usePositionStore = defineStore('position', {
    state: () => ({
        startPosition: { lat: 0, lng: 0 },
        endPosition: { lat: 0, lng: 0 },
        distance: 0,
        elapsedSeconds: 0,
    }),
    actions: {
        setStartPosition(lat: number, lng: number) {
            this.startPosition = { lat, lng };
        },
        setEndPosition(lat: number, lng: number) {
            this.endPosition = { lat, lng };
        },
        setDistance(dist: number) {
            this.distance = dist;
        },
        setElapsedSeconds(seconds: number) {
            this.elapsedSeconds = seconds;
        },
    },
})
