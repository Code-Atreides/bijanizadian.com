// Match the rounded-up member target shown throughout the chapter UI.
export function chapterGoalReached(chapter){
  return Number.isFinite(chapter.active)&&chapter.active>0&&chapter.joined>=Math.ceil(chapter.active*.8);
}
export const GOAL_RAIN_DURATION=20;
