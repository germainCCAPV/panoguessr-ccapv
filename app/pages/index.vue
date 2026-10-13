<script lang="ts" setup>
import Modal from "~/components/app/Modal.vue";

const multiplayer = useMultiplayer();
const musicStore = useMusiqueStore();

const multiplayerMenu = ref<boolean>(false);
const multiplayerMenuOpened = ref<boolean>(false);
const multiplayerMenuWaiting = ref<boolean>(false);
const multiplayerMenuCodeOpened = ref<boolean>(false);
const pseudoInputOpened = ref<boolean>(false);

const joinGameId = ref<string>("");
const pseudo = ref<string>("");

const gameMode = ref<"classic" | "elimination">("classic");

async function joinGame() {
  if (pseudo.value && joinGameId.value) {
    multiplayer.joinGame(joinGameId.value, pseudo.value);
  } else {
    multiplayer.createGame(pseudo.value, gameMode.value);
  }
  multiplayerMenu.value = false;
}

onMounted(() => {
  multiplayer.initializeWebSocket();
})

function openMultiplayerMenu() {
  multiplayerMenu.value = true;
  multiplayerMenuOpened.value = true;
  multiplayerMenuCodeOpened.value = false;
  multiplayerMenuWaiting.value = false;
  pseudoInputOpened.value = false;
}


function openPseudoInput() {
  multiplayerMenuCodeOpened.value = false;
  multiplayerMenuOpened.value = false;
  pseudoInputOpened.value = true;
}

function openCodeInput() {
  pseudoInputOpened.value = false;
  multiplayerMenuOpened.value = false;
  multiplayerMenuCodeOpened.value = true;
}

function backToMenu() {
  pseudoInputOpened.value = false;
  multiplayerMenuCodeOpened.value = false;
  multiplayerMenuOpened.value = true;
}

function startGame() {
  multiplayer.startGame();
}
</script>

<Modal :title="pseudoInputOpened ? 'Pseudo' : multiplayerMenuCodeOpened ? 'Code de la partie' : 'Multijoueur'" v-model:isVisible="multiplayerMenu">
    <template #body class="join-container" v-if="pseudoInputOpened">
      <input v-model="pseudo" placeholder="Entrez votre pseudo" class="game-code-input" />
      <div class="mode-choice">
        <label><input type="radio" value="classic" v-model="gameMode" /> Classique (5 rounds)</label>
        <label><input type="radio" value="elimination" v-model="gameMode" /> Élimination</label>
      </div>
      <div class="inline_btn">
        <AppButton @click="backToMenu">Retour</AppButton>
        <AppButton @click="joinGame">Jouez !</AppButton>
      </div>
    </template>
   
    <template #body class="join-container" v-if="multiplayerMenuCodeOpened">
      <input v-model="joinGameId" placeholder="Entrez un code de partie" class="game-code-input" />
      <div class="inline_btn">
        <AppButton @click="backToMenu">Retour</AppButton>
        <AppButton @click="openPseudoInput">Valider</AppButton>
      </div>
    </template>
    <template #body class="join-container" v-if="multiplayerMenuOpened">
      <AppButton @click="openPseudoInput">Créer une partie</AppButton>
      <AppButton @click="openCodeInput">Rejoindre une partie</AppButton>
    </template>
  </Modal>
  <Modal title="Salle d'attente" v-model:isVisible="multiplayerMenuWaiting">
    <template #body class="game-lobby" v-if="multiplayer.gameId">
      <div class="game-code">Code de la partie: <span class="bold_code">{{ multiplayer.gameId }}</span></div>
      <div class="players-list">
        <div class="players_title">Joueurs :</div>
        <ul>
          <AppAvatar  v-for="player in multiplayer.players" :key="player.id" :pseudo="player.username"/>
        </ul>
      </div>
      <AppButton v-if="multiplayer.players[0]?.id === multiplayer.playerId" @click="startGame">Démarrer la partie</AppButton>
    </template>
    <template #body class="game-lobby" v-else>
      <div class="game-wait-creation">Préparation des photos...</div>
    </template>
  </Modal>
  <div class="container">
    <AppHeader :music="musicStore.isPlaying"/>
    <div class="homepage">
      <div class="left">
        <div class="home-title">La devinette géographique !</div>    
        <div class="home-subtitle">Voici une photo, à vous de trouver où elle se situe sur une carte.</div>
        <div>
          <div class="buttons">
            <NuxtLink href="/game"><AppButton>Partie solo</AppButton></NuxtLink>
            <AppButton @click="openMultiplayerMenu">Multijoueur</AppButton>
          </div>
        </div>
      </div>
      <div class="right">
        <img src="~/assets/world.svg" alt="world" />
      </div>
    </div>
  </div>
  <div class="about">
    <div class="about-columns">
      <div class="left">
        <img class="pnx-logo" src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Panoramax.svg/480px-Panoramax.svg.png" alt="" />
      </div>
      <div class="right">
        <div class="home-subtitle">PanoGuessr est basé sur Panoramax, le géocommuns des photos de rues libres et gratuites.</div>
        <div class="buttons">
          <a href="https://panoramax.fr" target="_blank"><AppButton>En savoir plus</AppButton></a>
          <NuxtLink href="/credits"><AppButton>Crédits</AppButton></NuxtLink>
        </div>
      </div>
    </div>
    <iframe class="viewer" src="https://api.panoramax.xyz/#focus=pic&map=17/48.857143/2.29424&pic=40036f4e-d266-48e1-948d-0f0fa3ce681e&speed=250&xyz=33.51/24.95/0"></iframe>
  </div>
</template>

<style scoped lang="scss">
@use '~/assets/styles/global' as *;

  .mode-choice {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0.5rem 0;
  font-family: "Neo Regular", sans-serif;
  color: $white-color;

  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}
  
.container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-inline: 50px;
  margin-top: 20px;
  margin-bottom: 40px;
  gap: 2rem;


  @media screen and (max-width: 500px) {
    margin-inline: 20px;
  }
}

.about {
  margin: 0;
  padding: 80px;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  color: $white-color;
  background: $black-color;

  @media screen and (max-width: 500px) {
    padding: 20px;
    min-height: 400px;
  }
}

.about-columns {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 20px;

  @media screen and (max-width: 500px) {
    flex-direction: column;
    justify-content: center;
  }
}

.about-columns .left {
  flex: 1;
  text-align: center;

  @media screen and (max-width: 500px) {
    flex: unset;
  }
}

.about-columns .right {
  flex: 2 1;

  @media screen and (max-width: 500px) {
    flex: unset;
  }
}

.viewer {
  height: 500px;
  max-height: 80%;
  width: 100%;
  position: relative;
  border: none;
}

.pnx-logo {
  max-width: 200px;
  width: 100%;
  animation: bounce 5s infinite;
  opacity: 1;

  @media screen and (max-width: 500px) {
    animation-duration: 15s;
    height: 100px;
  }
}

.homepage {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 95%;
  height: 100%;
  gap: 1rem;

  @media screen and (max-width: 500px) {
    flex-direction: column-reverse;
    gap: 50px;
  }
}

.homepage .left {
  flex: 2 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: start;
  height: 100%;
  gap: 1.5rem;
}

.home-title {
  font-family: "Neo Extra", sans-serif;
  font-size: 2.2rem;
  color: $white-color;


  @media screen and (max-width: 500px) {
    font-size: 2rem;
  }
}

.home-subtitle {
  font-family: "Neo Extra", sans-serif;
  font-size: 1.5rem;
  text-align: justify;
  line-height: 2.5rem;
  color: $white-color;
}

.buttons {
  display: flex;
  flex-direction: row;
  width: 100%;
  margin-top: 25px;
  align-items: start;
  gap: 2rem;
}

.join-container {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.inline_btn {
  display: flex;
  flex-direction: row;
  gap: 5px;
  width: 100%;
  justify-content: center;
  align-items: center;
}

.game-code-input {
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 1.25rem;
  font-family: "Neo Extra", sans-serif;
  border: 1px solid $blue-shade-1;
  background: transparent;
  color: $white-color;
}

.game-lobby {
  color: $white-color;
  width: 100%;
}

.game-code, .game-wait-creation {
  font-family: "Neo Regular", sans-serif;
  font-size: 1rem;
  padding: 1rem;
}

.game-code {
  background: rgba($blue-shade-1, 0.2);
  border-radius: 4px;
}

.bold_code {
  font-family: "Neo Extra", sans-serif;
  font-size: 1.25rem;
}

.players-list {
  margin: 1rem 0;
}

.players_title {
  font-family: "Neo Bold", sans-serif;
  font-size: 1rem;
}

ul {
  list-style: none;
  padding: 0;
  font-family: "Neo Extra", sans-serif;
}

li {
  color: $white-color;
  list-style: disc inside;
  padding: 0.5rem 0;
}

.homepage .right {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;

  img {
    transform: scale(0.85);
    object-fit: cover;
    animation: bounce 10s infinite;

    @media screen and (max-width: 500px) {
      height: 150px;
    }
  }
}

.footer {
  font-family: "Neo Regular", sans-serif;
  font-size: 1rem;
}
  

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-30px); }
  50% { transform: translateY(0); }
  75% { transform: translateY(-15px); }
}
</style>
