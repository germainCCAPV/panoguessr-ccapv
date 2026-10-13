<script setup lang="ts">

import { Howl } from 'howler';

import type { GeoPoint } from "~~/types/geo";

import {
  getPanoramaxPictureIDs,
  haversineDistance
} from '~/utils/panoramax';


const clockTickingSound =
  useState<Howl>('clock-ticking-sound');


const pictureId =
  ref<string | null>(null);

const picturePosition =
  ref<GeoPoint | null>(null);

const loaderReady =
  ref<boolean>(false);

/**
 * Instant where the picture became visible: the countdown and
 * the time penalty both start from here.
 */
const roundStartedAt =
  ref<number | null>(null);

function onPictureReady() {
  loaderReady.value = true;

  if (roundStartedAt.value === null) {
    roundStartedAt.value = Date.now();
  }
}

/** Seconds spent on the round (0 if the picture never displayed). */
function getElapsedSeconds(): number {
  if (roundStartedAt.value === null) {
    return 0;
  }

  return Math.floor((Date.now() - roundStartedAt.value) / 1000);
}


const router =
  useRouter();

const positionStore =
  usePositionStore();

const roundStore =
  useRoundStore();

const musicStore =
  useMusiqueStore();


/**
 * Start a new round.
 *
 * The Panoramax API is called directly from
 * the browser. No Nuxt server API is required.
 */
onMounted(async () => {

  try {

    const pictures =
      await getPanoramaxPictureIDs(1);

    if (pictures.length > 0) {

      pictureId.value =
        pictures[0].id;

      picturePosition.value =
        pictures[0].position;
    }

  } catch (error) {

    console.error(
      'Impossible de trouver une photo Panoramax',
      error
    );
  }


  if (musicStore.isPlaying) {
    musicStore.pause();
  }

});


/**
 * Validate the player's guess.
 */
async function onValidate(
  position: GeoPoint
) {

  if (!picturePosition.value) {
    console.error(
      'Position Panoramax inconnue'
    );

    return;
  }


  // Calculate the distance directly in the browser.
  const distance =
    haversineDistance(
      picturePosition.value,
      position
    );


  // Stop ticking sound.
  if (clockTickingSound.value) {

    clockTickingSound.value.fade(
      0.2,
      0,
      500
    );

    clockTickingSound.value = null;
  }


  // Store the result.
  positionStore.setStartPosition(
    picturePosition.value.lat,
    picturePosition.value.lng
  );

  positionStore.setEndPosition(
    position.lat,
    position.lng
  );

  positionStore.setDistance(
    Math.round(distance)
  );

  positionStore.setElapsedSeconds(
    getElapsedSeconds()
  );


  // Go to result page.
  await router.push('/result');
}


/**
 * Validate the round when the timer expires.
 *
 * A timeout is represented by a guess at
 * coordinates 0,0, exactly as in the original game.
 */
async function timeOutValidation() {

  if (!picturePosition.value) {
    console.error(
      'Position Panoramax inconnue'
    );

    return;
  }


  const timeoutPosition: GeoPoint = {
    lat: 0,
    lng: 0
  };


  const distance =
    haversineDistance(
      picturePosition.value,
      timeoutPosition
    );


  // Stop ticking sound.
  if (clockTickingSound.value) {

    clockTickingSound.value.fade(
      0.2,
      0,
      500
    );

    clockTickingSound.value = null;
  }


  // Store the result.
  positionStore.setStartPosition(
    picturePosition.value.lat,
    picturePosition.value.lng
  );

  positionStore.setEndPosition(
    0,
    0
  );

  positionStore.setDistance(
    Math.round(distance)
  );

  positionStore.setElapsedSeconds(
    getElapsedSeconds()
  );


  // Go to result page.
  await router.push('/result');
}


/**
 * Toggle background music.
 */
function updateMusic() {
  musicStore.toggleMusic();
}

</script>


<template>

  <div class="page">

    <!-- Loading screen -->

    <div
      v-if="!pictureId"
      class="loading"
    >

      <AppButton>
        Round {{ roundStore.round }} / 5
      </AppButton>

      <div class="title">
        Chargement...
      </div>

    </div>


    <!-- Game -->

    <template v-else>

      <div
        v-if="loaderReady"
        class="countdown"
      >

        <div class="row-top">

          <AppButton>
            Round {{ roundStore.round }} / 5
          </AppButton>


          <div
            class="vol_button"
            @click="updateMusic()"
          >

            <Icon
              v-if="musicStore.isPlaying"
              name="tabler:volume"
            />

            <Icon
              v-else
              name="tabler:volume-off"
            />

          </div>

        </div>


        <AppTimer
          :start="120"
          @timeout="timeOutValidation"
        />

      </div>


      <MapViewer
        :picture-id="pictureId"
        @picready="onPictureReady"
      />


      <MapSelect
        @validate="onValidate"
      />

    </template>

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

</style>
