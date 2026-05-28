// Calculate daily calorie + macro targets.
// BMR via Mifflin-St Jeor, TDEE via standard activity multipliers.
// Protein at 2g/kg bodyweight, fat at 25% of calories, carbs fill the rest.
//
// Single source of truth — imported by both Onboarding and Settings.

export function calculateGoals({ age, sex, height_cm, weight_kg, activity_level, goal }) {
  const bmr = sex === 'male'
    ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 }
  const tdee = bmr * (multipliers[activity_level] || 1.2)

  const calorie_goal = Math.round(
    goal === 'lose' ? tdee - 500 :
    goal === 'gain' ? tdee + 300 : tdee
  )
  const protein_goal = Math.round(weight_kg * 2)
  const fat_goal = Math.round((calorie_goal * 0.25) / 9)
  const carbs_goal = Math.round((calorie_goal - protein_goal * 4 - fat_goal * 9) / 4)

  return { calorie_goal, protein_goal, fat_goal, carbs_goal }
}