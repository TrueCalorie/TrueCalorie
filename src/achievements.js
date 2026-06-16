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

// Local-date string (avoids the UTC off-by-one that .toISOString() causes for
// evening logs in US timezones). Matches Stats.jsx's toLocalDateStr.
function toLocalDateStr(date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Returns the keys of achievements newly earned this check.
 *
 * Streaks are consecutive CALENDAR days ending today: we walk back one day at a
 * time and stop at the first day that breaks the run, exactly like Stats.jsx's
 * currentStreak. `history` only contains days that have logs, so any date not
 * present is a gap that ends the streak.
 *
 * @param {Array<{date: string, calories: number, logged: boolean}>} history
 * @param {number} calorieGoal
 * @param {string[]} earned  — array of already-earned key strings (NOT objects)
 */
export function checkAchievements(history, calorieGoal, earned) {
  const newlyEarned = []
  // earned is already string[], so use it directly — don't .map(e => e.key)
  const earnedKeys  = new Set(earned)

  const loggedDays = history.filter(d => d.logged)
  const byDate     = new Map(loggedDays.map(d => [d.date, d]))
  const isGoalHit  = (d) => !!d && Math.abs(d.calories - calorieGoal) <= 100

  // First log
  if (loggedDays.length >= 1 && !earnedKeys.has('first_log')) {
    newlyEarned.push('first_log')
  }

  // Walk back from today over consecutive calendar days. The logging streak ends
  // at the first missing day; the goal-hit streak ends at the first missing day
  // OR the first logged day that missed goal.
  let loggingStreak    = 0
  let goalStreak       = 0
  let goalStreakBroken = false
  let check = toLocalDateStr(new Date())
  for (let i = 0; i < 60; i++) {
    const day = byDate.get(check)
    if (!day) break
    loggingStreak++
    if (!goalStreakBroken && isGoalHit(day)) goalStreak++
    else goalStreakBroken = true
    const prev = new Date(check + 'T12:00:00')
    prev.setDate(prev.getDate() - 1)
    check = toLocalDateStr(prev)
  }

  if (loggingStreak >= 3  && !earnedKeys.has('streak_3'))  newlyEarned.push('streak_3')
  if (loggingStreak >= 7  && !earnedKeys.has('streak_7'))  newlyEarned.push('streak_7')
  if (loggingStreak >= 30 && !earnedKeys.has('streak_30')) newlyEarned.push('streak_30')

  // First goal hit: any logged day within 100 of goal (not streak-dependent).
  if (loggedDays.some(isGoalHit) && !earnedKeys.has('goal_hit_1')) {
    newlyEarned.push('goal_hit_1')
  }
  if (goalStreak >= 5  && !earnedKeys.has('goal_hit_5'))  newlyEarned.push('goal_hit_5')
  if (goalStreak >= 10 && !earnedKeys.has('goal_hit_10')) newlyEarned.push('goal_hit_10')

  return newlyEarned
}
