<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { Howl } from 'howler';
import {useMultiplayer} from '~/stores/multiplayer';
import type { GeoPoint } from "~~/types/geo";
import {useRouter} from "#vue-router";

const multiplayer = useMultiplayer();
const clockTickingSound = useState<Howl>('clock-ticking-sound');
const pictureId = ref<string | null>(null);
const hasGuessed = ref(false);
const points = ref<Array<GeoPoint & { isTarget?: boolean } & { username?: string }>>([]);
const roundStore = useRoundStore();
const musicStore = useMusiqueStore();
const mapSelect = useTemplateRef('map-select');
const router = useRouter();
const loaderReady = ref<boolean>(false);

watch(() => multiplayer.currentLocationId, (newId) => {
  if (newId) {
    loaderReady.value = false;
    hasGuessed.value = false;
    pictureId.value = newId;
    points.value = [];
  }
});

function onValidate(position: GeoPoint) {
  if (clockTickingSound.value) {
    clockTickingSound.value.fade(0.2, 0, 500);
    clockTickingSound.value = null;
  }
  multiplayer.submitGuess(position.lat, position.lng);
  hasGuessed.value = true;
  mapSelect.value.resetPosition();
}

function timeOutValidation() {
  if (clockTickingSound.value) {
    clockTickingSound.value.fade(0.2, 0, 500);
    clockTickingSound.value = null;
  }
  multiplayer.submitGuess(0, 0);
  hasGuessed.value = true;
  mapSelect.value.resetPosition();
}

onMounted(() => {
  pictureId.value = multiplayer.currentLocationId;
  if (musicStore.isPlaying) {
    musicStore.pause();
  }

  // Redirect to home if no initial picture ID
  if(!pictureId.value) {
    router.push('/');
  }
});

function updateMusic() {
  musicStore.toggleMusic();
}

const waitingPlayers = computed(() => {
  return multiplayer.players.filter(
    (player: Player) => !multiplayer.guesses.some(
      (guess: Guess) => guess.playerId === player.id
    )
  );
});

watch(() => multiplayer.guesses, (newGuesses) => {
    if (!multiplayer.realLocation) return;

    points.value = [{
      lat: multiplayer.realLocation.lat,
      lng: multiplayer.realLocation.lng,
      isTarget: true,
    }];

    newGuesses.forEach((guess: { playerId: string, position: { lat: number, lng: number } }) => {
      points.value.push({
        lat: guess.position.lat,          // ← corrigé
        lng: guess.position.lng,          // ← corrigé
        isTarget: false,
        username: multiplayer.players.find(p => p.id === guess.playerId)?.username,
      });
    });
}, { deep: true });
  const sortedRoundScores = computed(() =>
  [...multiplayer.roundScores].sort((a, b) => b.points - a.points)
);

function formatDistance(distance: number): string {
  if (distance >= 1000) {
    return `${(distance / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
  }
  return `${distance.toLocaleString('fr-FR')} m`;
}
  const players = computed(() => multiplayer.players);
</script>

<template>
  <div class="page">
    <div v-if="!pictureId" class="loading">
      <div class="multiplayer-info">
        <AppButton>Joueurs: {{ multiplayer.players.length }}</AppButton>
        <AppButton>Round {{ roundStore.round }} / {{ multiplayer.totalRounds }}</AppButton>
      </div>
      <div class="title">Chargement...</div>
    </div>
    <div class="countdown" v-if="!hasGuessed && loaderReady">
      <div class="row-top">
        <div class="multiplayer-info">
          <AppButton>Joueurs: {{ multiplayer.players.length }}</AppButton>
          <AppButton>Round {{ roundStore.round }} / {{ multiplayer.totalRounds }}</AppButton>
        </div>
        <div class="vol_button">
          <Icon v-if="musicStore.isPlaying" @click="updateMusic()" name="tabler:volume"/>
          <Icon v-else @click="updateMusic()" name="tabler:volume-off"/>
        </div>
      </div>
      <AppTimer :start="120" @timeout="timeOutValidation"/>
    </div>
    <div v-else class="waiting">
      <template v-if="waitingPlayers.length > 1">
        <div class="waiting-title">En attente des autres joueurs...</div>
        <div class="waiting-players">
          <div
              v-for="player in waitingPlayers.filter(p => p.id !== multiplayer.playerId)"
              :key="player.id"
              class="waiting-player"
          >
            {{ player.username }}
          </div>
        </div>
      </template>
      <div v-else-if="!loaderReady" class="waiting-title">
        Chargement...
      </div>
      <div v-else-if="points.length <= 1" class="waiting-title">
        En attente des résultats...
      </div>
      <div class="map-overview" v-else>
        <div class="waiting-title">
          Round terminé, prochain round dans quelques instants...
        </div>
        <div v-if="multiplayer.eliminatedPlayerId" class="elimination-banner">
  <template v-if="multiplayer.eliminatedPlayerId === multiplayer.playerId">
    💀 Vous avez été éliminé !
  </template>
  <template v-else>
    ❌ {{ players.find(p => p.id === multiplayer.eliminatedPlayerId)?.username }} est éliminé
  </template>
</div>
          <div class="round-scores" v-if="multiplayer.roundScores.length">
    <div v-for="rs in sortedRoundScores" :key="rs.playerId" class="round-score-item">
      <span class="rs-player">
        {{ multiplayer.players.find(p => p.id === rs.playerId)?.username || '?' }}
      </span>
      <span class="rs-distance">{{ formatDistance(rs.distance) }}</span>
      <span class="rs-points">+{{ rs.points.toLocaleString('fr-FR') }} pts</span>
    </div>
  </div>
        <MapResultMulti :points="points" />
      </div>
    </div>
    <MapViewer v-if="pictureId" :picture-id="pictureId" @picready="() => loaderReady = true"/>
    <MapSelect ref="map-select" @validate="onValidate"/>
  </div>
</template>

<style scoped lang="scss">
@use '~/assets/styles/global' as *;

.page {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
}

.multiplayer-info {
  display: flex;
  gap: 1rem;
}

.map-overview {
  position: fixed;
  left: 30px;
  right: 30px;
}
.round-scores {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: min(400px, 90vw);
  padding: 1rem;
  margin-bottom: 1rem;
  background: rgba($blue-shade-1, 0.2);
  border-radius: 8px;

  .round-score-item {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    font-family: "Neo Regular", sans-serif;
    color: $white-color;

    .rs-points { font-family: "Neo Bold", sans-serif; }
  }
}
.waiting {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  color: $white-color;
  background-color: rgba(2, 41, 50, 0.55);
  backdrop-filter: blur(10px);
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;

  .waiting-title {
    font-family: "Neo Extra", sans-serif;
    font-size: 18px;
    opacity: 50%;
    text-align: center;
    margin-bottom: 2rem;
  }

  .waiting-players {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 2rem;
    background: rgba($blue-shade-1, 0.2);
    border-radius: 8px;

    .waiting-player {
      font-family: "Neo Regular", sans-serif;
      font-size: 12px;
    }
  }
}

.countdown {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: end;
  z-index: 1000;
  top: 1rem;
  right: 1rem;
  margin: 1rem;
  gap: 1rem;

  .row-top {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    align-items: center;
    justify-content: center;

    .vol_button {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 5px;
      background-color: $dark-color;
      border: 2px solid $blue-shade-2;
      border-radius: 100px;
      cursor: pointer;
    }
  }
}

.loading {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2rem;

  .title {
    font-family: "Mahoda", sans-serif;
    font-size: 1.25rem;
  }
}

.elimination-banner {
  font-family: "Neo Extra", sans-serif;
  font-size: 1.2rem;
  color: #ff6b6b;
  margin-bottom: 1rem;
}
</style>
