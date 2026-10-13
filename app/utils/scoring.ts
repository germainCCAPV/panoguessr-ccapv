/**
 * Règle de score unique, partagée par le solo (navigateur)
 * et par le multijoueur (serveur).
 *
 * Points d'une manche =
 *   5000 × exp(-distance / 6000)          (0 au-delà de 150 km ou sans clic)
 *   - 250 points toutes les 20 secondes   (jamais en dessous de 0)
 */

export const MAX_POINTS_PER_ROUND = 5000;

/** Au-delà de cette distance (mètres), la manche ne rapporte aucun point. */
export const MAX_SCORING_DISTANCE_M = 150_000;

/** Plus ce nombre est petit, plus les points baissent vite avec la distance. */
export const DISTANCE_DECAY_M = 6000;

/** Toutes les X secondes écoulées, le joueur perd TIME_PENALTY_POINTS points. */
export const TIME_PENALTY_INTERVAL_SECONDS = 20;
export const TIME_PENALTY_POINTS = 250;

/** Durée d'une manche. */
export const ROUND_DURATION_SECONDS = 120;

/**
 * Multijoueur : le temps annoncé par le navigateur ne peut pas être inférieur
 * au temps vu par le serveur moins cette tolérance (chargement de la photo).
 */
export const LOAD_GRACE_SECONDS = 10;


export interface ScoreBreakdown {
  /** Points gagnés grâce à la proximité. */
  distancePoints: number;
  /** Points perdus à cause du temps. */
  timePenalty: number;
  /** Score final de la manche (distancePoints - timePenalty). */
  points: number;
}


/**
 * Calcule le score d'une manche.
 *
 * @param distanceMeters Distance entre le clic et le vrai lieu, en mètres.
 * @param elapsedSeconds Secondes écoulées entre l'affichage de la photo et la validation.
 * @param hasGuess false si le joueur n'a pas cliqué (temps écoulé) : 0 point.
 */
export function computeRoundScore(
  distanceMeters: number,
  elapsedSeconds: number,
  hasGuess: boolean = true
): ScoreBreakdown {

  const distancePoints =
    !hasGuess ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters >= MAX_SCORING_DISTANCE_M
      ? 0
      : Math.round(
          MAX_POINTS_PER_ROUND * Math.exp(-distanceMeters / DISTANCE_DECAY_M)
        );

  const elapsed = Number.isFinite(elapsedSeconds)
    ? Math.max(0, elapsedSeconds)
    : 0;

  const timePenalty = Math.min(
    distancePoints,
    Math.floor(elapsed / TIME_PENALTY_INTERVAL_SECONDS) * TIME_PENALTY_POINTS
  );

  return {
    distancePoints,
    timePenalty,
    points: distancePoints - timePenalty
  };
}


/**
 * Multijoueur : détermine le temps retenu pour une manche.
 *
 * Le navigateur annonce son temps (mesuré depuis l'affichage de la photo),
 * mais le serveur ne lui fait pas aveuglément confiance : le temps retenu
 * n'est jamais inférieur au temps du serveur moins LOAD_GRACE_SECONDS,
 * et jamais supérieur à la durée de la manche.
 */
export function resolveElapsedSeconds(
  clientElapsedSeconds: unknown,
  serverElapsedSeconds: number
): number {

  const client = Number.isFinite(Number(clientElapsedSeconds))
    ? Math.max(0, Number(clientElapsedSeconds))
    : 0;

  const serverFloor = Math.max(0, serverElapsedSeconds - LOAD_GRACE_SECONDS);

  return Math.min(
    ROUND_DURATION_SECONDS,
    Math.floor(Math.max(client, serverFloor))
  );
}
