// ─── Achievement definitions ──────────────────────────────────────────────────
// Single source of truth for keys. Stats.jsx imports ACHIEVEMENTS directly
// so keys stay in sync automatically.

export const ACHIEVEMENTS = [
  { key: 'first_log',   label: 'First Step',   desc: 'Logged your first meal',                   icon: '🌱' },
  { key: 'streak_3',    label: '3 Day Streak',  desc: 'Logged meals 3 days in a row',             icon: '🔥' },
  { key: 'streak_7',    label: 'Week Warrior',  desc: 'Logged meals 7 days in a row',             icon: '⭐' },
  { key: 'streak_30',   label: 'Unstoppable',   desc: 'Logged meals 30 days in a row',            icon: '💪' },
  { key: 'goal_hit_1',  label: 'On Target',     desc: 'Hit your calorie goal for the first time', icon: '🎯' },
  { key: 'goal_hit_5',  label: 'Consistent',    desc: 'Hit your calorie goal 5 days in a row',    icon: '✅' },
  { key: 'goal_hit_10', label: 'Locked In',     desc: 'Hit your calorie goal 10 days in a row',   icon: '🏆' },
]

/**
 * Returns the keys of achievements newly earned this check.
 *
 * @param {Array<{date: string, calories: number, logged: boolean}>} history
 * @param {number} calorieGoal
 * @param {string[]} earned  — array of already-earned key strings (NOT objects)
 */
export function checkAchievements(history, calorieGoal, earned) {
  const newlyEarned = []
  // earned is already string[], so use it directly — don't .map(e => e.key)
  const earnedKeys  = new Set(earned)

  const loggedDays  = history.filter(d => d.logged)
  const sortedDates = [...loggedDays].sort((a, b) => new Date(b.date) - new Date(a.date))

  // First log
  if (loggedDays.length >= 1 && !earnedKeys.has('first_log')) {
    newlyEarned.push('first_log')
  }

  // Logging streak (consecutive days from most recent backwards)
  let loggingStreak = 0
  for (const day of sortedDates) {
    if (day.logged) loggingStreak++
    else break
  }
  if (loggingStreak >= 3  && !earnedKeys.has('streak_3'))  newlyEarned.push('streak_3')
  if (loggingStreak >= 7  && !earnedKeys.has('streak_7'))  newlyEarned.push('streak_7')
  if (loggingStreak >= 30 && !earnedKeys.has('streak_30')) newlyEarned.push('streak_30')

  // Goal hit streak (consecutive days within 100 cal of goal)
  let goalStreak = 0
  for (const day of sortedDates) {
    if (day.logged && Math.abs(day.calories - calorieGoal) <= 100) goalStreak++
    else break
  }
  if (goalStreak >= 1  && !earnedKeys.has('goal_hit_1'))  newlyEarned.push('goal_hit_1')
  if (goalStreak >= 5  && !earnedKeys.has('goal_hit_5'))  newlyEarned.push('goal_hit_5')
  if (goalStreak >= 10 && !earnedKeys.has('goal_hit_10')) newlyEarned.push('goal_hit_10')

  return newlyEarned
}
