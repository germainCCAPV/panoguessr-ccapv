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
});

// La partie démarre → vers la page de jeu
// (le store fait déjà router.push('/multiplayer') sur 'gameStarted',
//  donc il suffit de rester à l'écoute — rien à faire ici)
</script>

<template>
  <div class="page">
    <div class="lobby">
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

        <div class="lobby-timer" v-if="remainingSeconds !== null">
          <span class="lobby-timer-value" :class="{ urgent: remainingSeconds <= 10 }">
            {{ formatCountdown(remainingSeconds) }}
          </span>
          <span class="lobby-timer-label">Démarrage de la partie... dernier appel !</span>
        </div>

        <div v-if="!isHost" class="waiting-text">
          En attente que l'hôte lance la partie...
        </div>
        <AppButton v-else :disabled="remainingSeconds !== null" @click="multiplayer.startGame()">
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
  .lobby-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;

  .lobby-timer-value {
    font-family: "Neo Extra", sans-serif;
    font-size: 2.5rem;
    color: $white-color;

    &.urgent { color: #ff6b6b; animation: pulse-timer 1s infinite; }
  }

  .lobby-timer-label {
    font-family: "Neo Regular", sans-serif;
    font-size: 0.85rem;
    opacity: 0.6;
    color: $white-color;
  }
}

@keyframes pulse-timer {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
</style>
