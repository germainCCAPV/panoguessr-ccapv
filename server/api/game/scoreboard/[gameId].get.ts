import { getRouterParams } from 'h3';
import {haversineDistance} from "~~/server/api/end-game.post";

type ScoreboardResponse = {
  scores: Array<{
    position: number;
    player: string;
    score: number;
    label?: string;
  }>;
};

export default defineEventHandler(async (event): Promise<ScoreboardResponse> => {
  const { gameId } = getRouterParams(event);

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game ID is required',
    });
  }

  const game = gameState.getGame(gameId);

  if (!game) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Game not found',
    });
  }

  const scores = gameState.calculateScores(gameId, haversineDistance);

  return { scores };
});