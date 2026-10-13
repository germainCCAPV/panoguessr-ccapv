<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { Howl } from 'howler';
import {useMultiplayer} from '~/stores/multiplayer';
import type { GeoPoint } from "~~/types/geo";
import {useRouter} from "#vue-router";
import { ROUND_DURATION_SECONDS, MAX_POINTS_PER_ROUND, TIME_PENALTY_INTERVAL_SECONDS, TIME_PENALTY_POINTS } from "~/utils/scoring";

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

/**
 * Instant où la photo est devenue visible : le chrono de 2 minutes
 * et le malus de temps partent de là (comme en solo).
 */
const roundStartedAt = ref<number | null>(null);

function onPictureReady() {
  loaderReady.value = true;

  if (roundStartedAt.value === null) {
    roundStartedAt.value = Date.now();
  }
}

/** Secondes passées sur la manche (0 si la photo ne s'est jamais affichée). */
function getElapsedSeconds(): number {
  if (roundStartedAt.value === null) {
    return 0;
  }

  return Math.floor((Date.now() - roundStartedAt.value) / 1000);
}

watch(() => multiplayer.currentLocationId, (newId) => {
  if (newId) {
    loaderReady.value = false;
    roundStartedAt.value = null;
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
  multiplayer.submitGuess(position.lat, position.lng, getElapsedSeconds());
  hasGuessed.value = true;
  mapSelect.value.resetPosition();
}

function timeOutValidation() {
  if (clockTickingSound.value) {
    clockTickingSound.value.fade(0.2, 0, 500);
    clockTickingSound.value = null;
  }
  multiplayer.submitGuess(0, 0, ROUND_DURATION_SECONDS);
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
    (player: Player) =>
      // Les joueurs déjà éliminés ne jouent plus : on ne les attend pas.
      !multiplayer.eliminatedIds.includes(player.id) &&
      !multiplayer.guesses.some(
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

// Scores de la manche qui vient de se terminer, du meilleur au moins bon.
const sortedRoundScores = computed(() =>
  [...multiplayer.roundScores].sort((a, b) => b.points - a.points || b.total - a.total)
);

function playerName(playerId: string): string {
  return multiplayer.players.find((p: Player) => p.id === playerId)?.username || '?';
}

const formatPoints = (value: number) => value.toLocaleString('fr-FR');

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes} min ${rest.toString().padStart(2, '0')} s` : `${rest} s`;
}

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
          <div class="rs-caption">
            <template v-if="multiplayer.mode === 'elimination'">
              Manche {{ roundStore.round }} / {{ multiplayer.totalRounds }} — le joueur le plus éloigné est éliminé
            </template>
            <template v-else>
              Manche {{ roundStore.round }} / {{ multiplayer.totalRounds }} — {{ formatPoints(MAX_POINTS_PER_ROUND) }} points maximum,
              −{{ formatPoints(TIME_PENALTY_POINTS) }} points toutes les {{ TIME_PENALTY_INTERVAL_SECONDS }} secondes
            </template>
          </div>
          <div class="round-score-item rs-header">
            <span class="rs-rank">#</span>
            <span class="rs-player">Joueur</span>
            <span class="rs-distance">Distance</span>
            <span class="rs-time">Temps</span>
            <span class="rs-points">Manche</span>
            <span class="rs-total">Total</span>
          </div>
          <div class="rs-rows">
            <div
                v-for="(rs, index) in sortedRoundScores"
                :key="rs.playerId"
                :class="['round-score-item', { me: rs.playerId === multiplayer.playerId }]"
            >
              <span class="rs-rank">{{ index + 1 }}</span>
              <span class="rs-player">
                {{ playerName(rs.playerId) }}<template v-if="rs.playerId === multiplayer.eliminatedPlayerId"> ❌</template>
              </span>
              <span class="rs-distance">{{ rs.hasGuess ? formatDistance(rs.distance) : '—' }}</span>
              <span class="rs-time">{{ rs.hasGuess ? formatElapsed(rs.elapsedSeconds) : 'temps écoulé' }}</span>
              <span class="rs-points">
                +{{ formatPoints(rs.points) }}
                <small v-if="rs.timePenalty > 0" class="rs-penalty">(−{{ formatPoints(rs.timePenalty) }})</small>
              </span>
              <span class="rs-total">{{ formatPoints(rs.total) }}</span>
            </div>
          </div>
        </div>
        <MapResultMulti :points="points" />
      </div>
    </div>
    <MapViewer v-if="pictureId" :picture-id="pictureId" @picready="onPictureReady"/>
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
  gap: 0.4rem;
  width: min(640px, 92vw);
  margin: 0 auto 1rem;
  padding: 0.8rem 1rem;
  background: rgba($blue-shade-1, 0.2);
  border-radius: 8px;
  font-family: "Neo Regular", sans-serif;
  color: $white-color;

  .rs-caption {
    font-size: 0.8rem;
    text-align: center;
    color: $blue-shade-1;
  }

  .rs-rows {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    max-height: 22vh;
    overflow-y: auto;
  }

  .round-score-item {
    display: grid;
    grid-template-columns: 1.5rem minmax(0, 1fr) 5rem 5.5rem 7rem 4.5rem;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;

    span {
      text-align: right;
    }

    .rs-rank,
    .rs-player {
      text-align: left;
    }

    .rs-player {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .rs-points,
    .rs-total {
      font-family: "Neo Bold", sans-serif;
    }

    .rs-penalty {
      font-family: "Neo Regular", sans-serif;
      font-size: 0.75rem;
      color: $blue-shade-1;
    }

    &.rs-header {
      font-size: 0.75rem;
      color: $blue-shade-1;
      border-bottom: 1px solid rgba($white-color, 0.2);
      padding-bottom: 0.2rem;
    }

    &.me {
      color: $blue-shade-1;
    }
  }

  @media screen and (max-width: 600px) {
    .round-score-item {
      grid-template-columns: 1.2rem minmax(0, 1fr) 4rem 5rem 3.5rem;

      .rs-time {
        display: none;
      }
    }
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
