<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
const multiplayer = useMultiplayer();

const isHost = computed(() =>
  multiplayer.players[0]?.id === multiplayer.playerId
);
// Compte à rebours de la fenêtre de démarrage
const remainingSeconds = ref<number | null>(null);
let countdownInterval: ReturnType<typeof setInterval> | null = null;

function updateCountdown() {
  if (multiplayer.lobbyDeadline === null || multiplayer.lobbyDeadline <= Date.now()) {
    remainingSeconds.value = null;
    return;
  }
  remainingSeconds.value = Math.round((multiplayer.lobbyDeadline - Date.now()) / 1000);
}
// Pas de partie en cours → retour à l'accueil
onMounted(() => {
  if (!multiplayer.gameId) {
    router.replace('/');
  }
  updateCountdown();                                        // ← AJOUT : état initial
  countdownInterval = setInterval(updateCountdown, 1000);   // ← AJOUT : tic chaque seconde
});

// Nettoyage du chrono si on quitte la page
onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval);
});

// La partie démarre → vers la page de jeu
// (le store fait déjà router.push('/multiplayer') sur 'gameStarted',
//  donc il suffit de rester à l'écoute — rien à faire ici)
</script>

<template>
  <div class="page">
    <!-- ÉTAT 1 : compte à rebours plein écran (fenêtre de 30 s) -->
    <div class="countdown-screen" v-if="remainingSeconds !== null">
      <div class="countdown-title">La partie va commencer !</div>
      <div
        class="countdown-value"
        :class="{
          urgent: remainingSeconds <= 10 && remainingSeconds > 0,
          last: remainingSeconds <= 3
        }"
      >
        {{ formatCountdown(remainingSeconds) }}
      </div>
      <div class="countdown-label">Préparez-vous... dernier appel pour rejoindre !</div>
      <div class="countdown-players">
        <AppAvatar
          v-for="player in multiplayer.players"
          :key="player.id"
          :pseudo="player.username"
        />
      </div>
    </div>

    <!-- ÉTAT 2 : salle d'attente classique (avant le démarrage) -->
    <div class="lobby" v-else>
      <div class="lobby-title">Salle d'attente</div>

      <template v-if="multiplayer.gameId">
        <div class="game-code">
          Code de la partie :
          <span class="bold_code">{{ multiplayer.gameId }}</span>
        </div>

        <div class="players-list">
          <div class="players_title">Joueurs ({{ multiplayer.players.length }}) :</div>
          <ul>
            <AppAvatar
              v-for="player in multiplayer.players"
              :key="player.id"
              :pseudo="player.username"
            />
          </ul>
        </div>

        <div v-if="!isHost" class="waiting-text">
          En attente que l'hôte lance la partie...
        </div>
        <AppButton v-else @click="multiplayer.startGame()">
          Démarrer la partie
        </AppButton>
      </template>

      <div v-else class="waiting-text">Préparation des photos...</div>
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
}

.lobby {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  width: min(500px, 90vw);
  padding: 2rem;
  background: rgba($blue-shade-1, 0.2);
  border-radius: 8px;
}

.lobby-title {
  font-family: "Neo Extra", sans-serif;
  font-size: 2rem;
  color: $white-color;
}

.game-code {
  font-family: "Neo Regular", sans-serif;
  font-size: 1rem;
  padding: 1rem;
  color: $white-color;
  background: rgba($blue-shade-1, 0.4);
  border-radius: 4px;
}

.bold_code {
  font-family: "Neo Extra", sans-serif;
  font-size: 1.25rem;
}

.players-list {
  width: 100%;
  color: $white-color;
}

.players_title {
  font-family: "Neo Bold", sans-serif;
  margin-bottom: 0.5rem;
}

ul {
  list-style: none;
  padding: 0;
}

.waiting-text {
  font-family: "Neo Regular", sans-serif;
  color: $white-color;
  opacity: 0.7;
}
.countdown-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  width: 100vw;
  min-height: 100vh;
  color: $white-color;
}

.countdown-title {
  font-family: "Neo Extra", sans-serif;
  font-size: 2rem;
}

.countdown-value {
  font-family: "Neo Extra", sans-serif;
  font-size: 6rem;
  line-height: 1;
  color: $white-color;
  text-shadow: 0 0 30px rgba($blue-shade-2, 0.8);

  &.urgent {
    color: #ffb43a;
  }

  &.last {
    color: #ff6b6b;
    animation: tick-pulse 1s infinite;
  }
}

.countdown-label {
  font-family: "Neo Regular", sans-serif;
  font-size: 1rem;
  opacity: 0.7;
  text-align: center;
}

.countdown-players {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

@keyframes tick-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
</style>
