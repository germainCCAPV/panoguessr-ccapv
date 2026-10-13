<script setup lang="ts">
import { useRouter } from "vue-router";
import { computed } from 'vue';
import { useRoundStore, MAX_ROUNDS } from "~/stores/round";
import { computeRoundScore, MAX_POINTS_PER_ROUND } from "~/utils/scoring";

const router = useRouter();

const positionStore = usePositionStore();
const roundStore = useRoundStore();
const startPosition = computed(() => positionStore.startPosition);
const endPosition = computed(() => positionStore.endPosition);
const distanceMeters = computed(() => positionStore.distance);
const noGuess = computed(() => endPosition.value.lat === 0 && endPosition.value.lng === 0);
// Règle de score commune au solo et au multijoueur (voir app/utils/scoring.ts).
const elapsedSeconds = positionStore.elapsedSeconds;
const { timePenalty, points } = computeRoundScore(
  distanceMeters.value,
  elapsedSeconds,
  !noGuess.value
);
roundStore.setRoundScore(points);

const isLastRound = computed(() => roundStore.round >= MAX_ROUNDS);
const maxTotal = MAX_ROUNDS * MAX_POINTS_PER_ROUND;
const formatPoints = (value: number) => value.toLocaleString('fr-FR');

function play() {
  roundStore.nextRound();
  router.push("/game");
}

function replay() {
  roundStore.reset();
  router.push("/game");
}

function goHome() {
  roundStore.reset();
  router.push("/");
}

function formatDistance(distance: number): string {
  if (distance >= 1000) {
    return `${(distance / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
  }
  return `${distance.toLocaleString('fr-FR')} m`;
}
const formattedDistance = computed(() => formatDistance(distanceMeters.value));
const formattedElapsed = computed(() => {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return minutes > 0 ? `${minutes} min ${seconds.toString().padStart(2, '0')} s` : `${seconds} s`;
});

</script>

<template>
  <div class="page">
    <div class="result">
      <div class="title">
        <div class="result_title">Résultat : {{ points }} points. </div>
        <div class="total_title">(Total : {{ roundStore.score }} points)</div>
      </div>
      <h4 v-if="!noGuess" class="distance">Distance : {{ formattedDistance }}</h4>
      <h4 v-if="noGuess" class="distance">Temps écoulé !</h4>
      <h4 v-if="!noGuess" class="distance">
        Temps : {{ formattedElapsed }}
        <template v-if="timePenalty > 0">(malus : −{{ formatPoints(timePenalty) }} points)</template>
      </h4>
      <MapResult :start-position="startPosition" :end-position="endPosition" />
      <div v-if="isLastRound" class="final">
        <h2 class="final_title">Partie terminée !</h2>
        <div class="final_score">{{ formatPoints(roundStore.score) }} <span>/ {{ formatPoints(maxTotal) }} points</span></div>
        <ul class="final_rounds">
          <li v-for="(roundPoints, index) in roundStore.scores" :key="index">
            <span>Manche {{ index + 1 }}</span>
            <strong>{{ formatPoints(roundPoints) }}</strong>
          </li>
        </ul>
        <div class="final_actions">
          <AppButton @click="replay">Rejouer</AppButton>
          <AppButton @click="goHome">Accueil</AppButton>
        </div>
      </div>
      <AppButton v-else @click="play">Suivant</AppButton>
    </div>
  </div>
</template>

<style scoped lang="scss">

@use '~/assets/styles/global' as *;

.page {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100vw;
  min-height: 100vh;

  .result {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    width: 70%;

    .distance {
      font-family: 'Neo Bold', sans-serif;
      color: $white-color;
    }

    .title {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;

      .result_title {
        font-size: 1.5rem;
        font-family: 'Neo Bold', sans-serif;
        color: $white-color;
      }

      .total_title {
        font-size: 1rem;
        font-family: 'Neo Bold', sans-serif;
        color: $blue-shade-1;
      }
    }

    .final {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      font-family: 'Neo Bold', sans-serif;
      color: $white-color;

      .final_title {
        font-size: 1.8rem;
      }

      .final_score {
        font-size: 3rem;

        span {
          font-size: 1.2rem;
          color: $blue-shade-1;
        }
      }

      .final_rounds {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.5rem 1.5rem;

        li {
          display: flex;
          gap: 0.5rem;

          span {
            color: $blue-shade-1;
          }
        }
      }

      .final_actions {
        display: flex;
        gap: 1rem;
        margin-top: 0.5rem;
      }
    }
  }
}
</style>
