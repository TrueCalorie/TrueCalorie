export const ACHIEVEMENTS = [
  { key: 'first_log', label: 'First Step', desc: 'Logged your first meal', icon: '🌱' },
  { key: 'streak_3', label: '3 Day Streak', desc: 'Logged meals 3 days in a row', icon: '🔥' },
  { key: 'streak_7', label: 'Week Warrior', desc: 'Logged meals 7 days in a row', icon: '⭐' },
  { key: 'streak_30', label: 'Unstoppable', desc: 'Logged meals 30 days in a row', icon: '💪' },
  { key: 'goal_hit_1', label: 'On Target', desc: 'Hit your calorie goal for the first time', icon: '🎯' },
  { key: 'goal_hit_5', label: 'Consistent', desc: 'Hit your calorie goal 5 days in a row', icon: '✅' },
  { key: 'goal_hit_10', label: 'Locked In', desc: 'Hit your calorie goal 10 days in a row', icon: '🏆' },
]

export function checkAchievements(history, calorieGoal, earned) {
  const newlyEarned = []
  const earnedKeys = new Set(earned.map(e => e.key))

  const loggedDays = history.filter(d => d.logged)
  const sortedDates = [...loggedDays].sort((a, b) => new Date(b.date) - new Date(a.date))

  // First log
  if (loggedDays.length >= 1 && !earnedKeys.has('first_log')) {
    newlyEarned.push('first_log')
  }

  // Logging streaks
  let loggingStreak = 0
  for (const day of sortedDates) {
    if (day.logged) loggingStreak++
    else break
  }

  if (loggingStreak >= 3 && !earnedKeys.has('streak_3')) newlyEarned.push('streak_3')
  if (loggingStreak >= 7 && !earnedKeys.has('streak_7')) newlyEarned.push('streak_7')
  if (loggingStreak >= 30 && !earnedKeys.has('streak_30')) newlyEarned.push('streak_30')

  // Goal hit streaks (within 100 calories of goal)
  let goalStreak = 0
  for (const day of sortedDates) {
    const diff = Math.abs(day.calories - calorieGoal)
    if (day.logged && diff <= 100) goalStreak++
    else break
  }

  if (goalStreak >= 1 && !earnedKeys.has('goal_hit_1')) newlyEarned.push('goal_hit_1')
  if (goalStreak >= 5 && !earnedKeys.has('goal_hit_5')) newlyEarned.push('goal_hit_5')
  if (goalStreak >= 10 && !earnedKeys.has('goal_hit_10')) newlyEarned.push('goal_hit_10')

  return newlyEarned
}