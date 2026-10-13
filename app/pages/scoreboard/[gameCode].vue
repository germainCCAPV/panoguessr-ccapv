<script setup lang="ts">
import { useRoute } from 'vue-router';
import { ref, onMounted, watch, computed } from 'vue';
import { launchConfettiShower, celebrateWinner, fireworkEffect } from '~/utils/confetti-utils';

const route = useRoute();
const gameCode = route.params.gameCode as string;
const isRevealed = ref(false);
const animationComplete = ref(false);
const revealIndex = ref(-1);
const showScores = ref(false);
const pending = ref(true);
const data = ref<{ scores: any[] }>({ scores: [] });

const fetchData = async () => {
  try {
    pending.value = true;
    const response = await $fetch(`/api/game/scoreboard/${gameCode}`, {
      method: 'GET'
    });
    data.value = response as { scores: any[] };
    pending.value = false;
  } catch (error) {
    console.error('Erreur lors du chargement des scores:', error);
    pending.value = false;
  }
};

onMounted(() => {
  fetchData();
});

const scoreboard = computed(() => data.value?.scores || []);

const titleClasses = ref('');

const playRevealSound = () => {
  const audio = new Audio('/sounds/reveal.mp3');
  audio.volume = 0.5;
  audio.play().catch(e => console.warn('Audio playback prevented:', e));
};

const revealNextScore = () => {
  if (revealIndex.value < scoreboard.value.length - 1) {
    revealIndex.value++;

    const currentScore = scoreboard.value[revealIndex.value];
    if (currentScore && currentScore.position === 1) {
      celebrateWinner();
    }

    setTimeout(revealNextScore, 800);
  } else {
    animationComplete.value = true;

    setTimeout(() => {
      fireworkEffect();
    }, 500);
  }
};

watch(() => pending.value, (isPending) => {
  if (!isPending && !showScores.value && scoreboard.value.length > 0) {
    showScores.value = true;

    setTimeout(() => {
      titleClasses.value = 'animate-title';
      playRevealSound();

      setTimeout(() => {
        isRevealed.value = true;
        revealNextScore();
      }, 1000);
    }, 500);
  }
});

const startAnimations = () => {
  if (!showScores.value && scoreboard.value.length > 0) {
    showScores.value = true;

    setTimeout(() => {
      titleClasses.value = 'animate-title';
      playRevealSound();

      setTimeout(() => {
        isRevealed.value = true;
        revealNextScore();
      }, 1000);
    }, 500);
  }
};

onMounted(() => {
  fetchData().then(() => {
    startAnimations();
  });
});
</script>

<template>
  <div class="container">
    <div class="loading-overlay" v-if="pending">
      <div class="spinner"></div>
      <div class="loading-text">Chargement des résultats...</div>
    </div>

    <div class="scoreboard_container">
      <div :class="['home-title', titleClasses]">
        <span class="title-char" v-for="(char, i) in 'Résultat'" :key="i" :style="{ animationDelay: `${0.1 * i}s` }">
          {{ char }}
        </span>
      </div>

      <div class="scores">
        <div v-for="(score, index) in scoreboard"
             :key="score.position"
             :class="['score-item',
                     { 'winner': score.position === 1 },
                     { 'second-place': score.position === 2 },
                     { 'third-place': score.position === 3 },
                     { 'revealed': index <= revealIndex }]">
          <AppScore :position="score.position" :pseudo="score.player" :points="score.score" :label="score.label" />
          <div class="trophy" v-if="score.position === 1">
            <img :src="`/images/trophy.svg`" alt="Trophy"
                 class="trophy-icon" :class="`trophy-${score.position}`" />
          </div>
        </div>
      </div>

      <div class="button-container">
        <transition name="bounce">
          <AppButton v-if="animationComplete">
            <a href="/">Retour</a>
          </AppButton>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '~/assets/styles/global' as *;

$gold: #FFD700;
$silver: #C0C0C0;
$bronze: #CD7F32;

.container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow-x: hidden;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 100;
  font-family: "Mahoda", sans-serif;

  .spinner {
    width: 60px;
    height: 60px;
    border: 5px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    border-top-color: $white-color;
    animation: spin 1s ease-in-out infinite;
  }

  .loading-text {
    color: $white-color;
    margin-top: 20px;
    font-size: 1.2rem;
    letter-spacing: 1px;
  }
}

.scoreboard_container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 95%;
  max-width: 800px;
  height: 100%;
  gap: 4rem;
  z-index: 2;
  padding: 2rem 0;
}

.button-container {
  margin-bottom: 20px;
}

.home-title {
  font-family: "Neo Extra", sans-serif;
  font-size: 3.5rem;
  color: $white-color;
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;

  .title-char {
    opacity: 0;
    transform: translateY(-50px) rotate(-10deg);
    display: inline-block;
    animation: charAppear 0.5s ease forwards;
    text-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
  }
}

.scores {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  align-items: center;
}

.score-item {
  position: relative;
  width: 90%;
  padding: 0.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  overflow: hidden;
  margin-bottom: 1.5rem;
  opacity: 0;
  transform: translateX(-100px) skew(-10deg);

  &.revealed {
    opacity: 1;
    transform: translateX(0) skew(-10deg);
  }

  > * {
    transform: skew(10deg);
  }

  &.winner {
    background: linear-gradient(90deg, rgba(255,215,0,0.2) 0%, rgba(255,255,255,0.1) 100%);
    border: 1px solid rgba(255, 215, 0, 0.5);
    animation: winner-pulse 3s infinite;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      animation: light-sweep 2s infinite;
    }
  }

  &.second-place {
    background: linear-gradient(90deg, rgba(192,192,192,0.2) 0%, rgba(255,255,255,0.1) 100%);
    border: 1px solid rgba(192, 192, 192, 0.5);
  }

  &.third-place {
    background: linear-gradient(90deg, rgba(205,127,50,0.2) 0%, rgba(255,255,255,0.1) 100%);
    border: 1px solid rgba(205, 127, 50, 0.5);
  }

  .score-position {
    position: absolute;
    left: -10px;
    top: -10px;
    width: 30px;
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    font-weight: bold;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);

    &:nth-child(1) {
      background-color: $gold;
      color: #000;
    }

    &:nth-child(2) {
      background-color: $silver;
      color: #000;
    }

    &:nth-child(3) {
      background-color: $bronze;
      color: #000;
    }
  }

  .trophy {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);

    .trophy-icon {
      width: 30px;
      height: 30px;
      opacity: 0.8;

      &.trophy-1 {
        filter: drop-shadow(0 0 5px $gold);
      }

      &.trophy-2 {
        filter: drop-shadow(0 0 5px $silver);
      }

      &.trophy-3 {
        filter: drop-shadow(0 0 5px $bronze);
      }
    }
  }
}

.score-reveal-enter-active,
.score-reveal-leave-active {
  transition: all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.score-reveal-enter-from,
.score-reveal-leave-to {
  opacity: 0;
  transform: translateX(-100px) scale(0.9);
}

.bounce-enter-active {
  animation: bounce 0.8s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes charAppear {
  to {
    opacity: 1;
    transform: translateY(0) rotate(0);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0% { transform: scale(0.5) skew(-10deg); opacity: 0; }
  50% { transform: scale(1.2) skew(-10deg); }
  100% { transform: scale(1) skew(-10deg); opacity: 1; }
}

@keyframes winner-pulse {
  0% {
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
  }
  100% {
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }
}

@keyframes light-sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes twinkle {
  0% {
    opacity: 0.2;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1.2);
  }
}

@keyframes float {
  0% {
    transform: translateY(0) translateX(0);
  }
  50% {
    transform: translateY(-30px) translateX(20px);
  }
  100% {
    transform: translateY(20px) translateX(-15px);
  }
}

@keyframes crown-shine {
  0%, 100% {
    box-shadow: 0 0 5px $gold;
  }
  50% {
    box-shadow: 0 0 15px $gold;
  }
}

@keyframes podium-appear {
  from {
    opacity: 0;
    transform: translateY(50px) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>