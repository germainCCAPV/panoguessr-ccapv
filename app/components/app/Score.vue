<script setup lang="ts">
const props = defineProps<{
  pseudo: string,
  position: number,
  points: number,
  // Texte affiché à la place des points (ex. « Éliminé manche 2 » en mode élimination)
  label?: string
}>()

const formattedNumber = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}).format(Math.round(props.points));

</script>

<template>
  <div class="score">
    <div :class="['full-width', 'top-' + position]">
      <div class="left">
        <div class="pseudo">{{position}}. {{ pseudo }}</div>
      </div>
      <div class="right">
        <div class="points">{{ label ?? formattedNumber }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '~/assets/styles/global' as *;

.score {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  justify-content: start;
  align-content: center;

  .position {
    display: flex;
    font-size: 1rem;
    color: $white-color;
    font-family: 'Neo Bold', sans-serif;
    gap: 1rem;
  }

  .full-width {
    background: linear-gradient(-10deg, $blue-shade-4 0%, $blue-shade-3 110%);
    color: $white-color;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border: none;
    box-shadow: inset 0 0 3px 0.25px $shadow-color, 0 1px 3px 0.25px $shadow-color;
    border-radius: 3px;
    font-family: "Neo Extra", sans-serif;
    font-size: 1rem;
    font-weight: bold;
    transition: all 0.25s;
    transform: translateY(0px) skew(-10deg);
    gap: 7rem;

    &.top-1 {
      background: linear-gradient(-10deg, $yellow-shade-3 0%, $yellow-shade-4 110%);
    }

    &.top-2 {
      background: linear-gradient(-10deg, $yellow-shade-2 0%, $yellow-shade-3 110%);
    }

    &.top-3 {
      background: linear-gradient(-10deg, $yellow-shade-1 0%, $yellow-shade-2 110%);
    }

    .left {
      display: flex;
      flex-direction: row;
      gap: 0.5rem;
      justify-content: start;
      align-items: center;
    }

    .right {
      display: flex;
      flex-direction: row;
      gap: 0.5rem;
      justify-content: end;
      align-items: center;
    }
  }
}
</style>
