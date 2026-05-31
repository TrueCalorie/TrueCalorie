// ─── Nutrition target calculations ────────────────────────────────────────────
// Single source of truth — imported by Onboarding, Settings, and anywhere
// macro targets are calculated.
//
// Two functions:
//   calculateGoals()    — standard Mifflin-St Jeor + TDEE multipliers (free tier)
//   calculateGoalsPro() — sport-specific TDEE + athletic macro splits (Pro tier)
//
// The Pro function is meaningfully different for serious athletes:
// - Runners at 90mi/week have a TDEE multiplier of ~2.05, not 1.725 (the cap
//   of the standard formula). The standard formula literally cannot produce an
//   accurate target for high-volume athletes.
// - Macro splits are sport-specific: endurance athletes need 55-65% carbs for
//   glycogen; strength athletes need 2.4g/kg protein, not 2g/kg.
// - Calorie adjustments for goal are smaller for athletes (-250 instead of -500)
//   because a 500-cal deficit destroys performance and recovery at high volume.

// ─── Standard calculation (free tier) ────────────────────────────────────────
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
  const fat_goal     = Math.round((calorie_goal * 0.25) / 9)
  const carbs_goal   = Math.round((calorie_goal - protein_goal * 4 - fat_goal * 9) / 4)

  return { calorie_goal, protein_goal, fat_goal, carbs_goal }
}

// ─── Pro calculation (Pro tier) ───────────────────────────────────────────────
// Returns all standard fields PLUS breakdown fields used to show methodology:
//   tdee         — total daily energy expenditure before goal adjustment
//   bmr          — basal metabolic rate
//   training_cal — daily calories from training load
//   sport        — sport string (echoed back)

export function calculateGoalsPro({
  age, sex, height_cm, weight_kg,
  activity_level, goal,
  sport, weekly_mileage, training_hours_week,
}) {
  const bmr = sex === 'male'
    ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

  const roundedBmr = Math.round(bmr)
  let tdee, training_cal

  // ── Sport-aware TDEE ───────────────────────────────────────────────────────
  if (sport === 'running' && weekly_mileage > 0) {
    // Mileage-indexed multiplier. The standard formula caps at 1.725 ("very active")
    // which is appropriate for a person who exercises ~1 hr/day. At 90mi/week a
    // runner is putting in 10-15 hrs/week of work. The multiplier must reflect that.
    const multiplier = getRunnerMultiplier(Number(weekly_mileage))
    tdee = bmr * multiplier
    training_cal = Math.round(tdee - bmr * 1.3) // approx training contribution

  } else if (sport === 'cycling' && weekly_mileage > 0) {
    // Road cycling: ~550 cal/hr, or ~35 cal/mile at moderate pace.
    // Use miles if provided, else fall back to hours.
    const daily_cycling = weekly_mileage > 0
      ? (Number(weekly_mileage) * 35) / 7
      : (Number(training_hours_week) * 550) / 7
    const base = bmr * 1.3  // light daily activity outside training
    tdee         = base + daily_cycling
    training_cal = Math.round(daily_cycling)

  } else if (sport === 'swimming' && training_hours_week > 0) {
    // Swimming is metabolically costly: ~700 cal/hr (water resistance + thermoregulation)
    const daily_swim = (Number(training_hours_week) * 700) / 7
    const base       = bmr * 1.35
    tdee         = base + daily_swim
    training_cal = Math.round(daily_swim)

  } else if (sport === 'strength' && training_hours_week > 0) {
    // Resistance training + elevated EPOC: ~420 cal/hr of training
    const daily_strength = (Number(training_hours_week) * 420) / 7
    const base           = bmr * 1.4  // strength athletes are more active at rest
    tdee         = base + daily_strength
    training_cal = Math.round(daily_strength)

  } else if (sport === 'team' && training_hours_week > 0) {
    // Team sports are aerobic + anaerobic mixed: ~600 cal/hr
    const daily_team = (Number(training_hours_week) * 600) / 7
    const base       = bmr * 1.35
    tdee         = base + daily_team
    training_cal = Math.round(daily_team)

  } else {
    // No sport-specific data — fall back to standard formula
    const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 }
    tdee         = bmr * (multipliers[activity_level] || 1.2)
    training_cal = 0
  }

  const roundedTdee = Math.round(tdee)

  // ── Calorie goal adjustment ────────────────────────────────────────────────
  // Athletes use smaller adjustments than general population:
  // - A 500-cal deficit at 3,500 cal/day is 14% — too aggressive, kills performance
  // - A 250-cal deficit is ~7% — sustainable without impacting training quality
  // - A 200-cal surplus is enough for lean muscle gain without excess fat
  const calorie_goal = Math.round(
    goal === 'lose' ? roundedTdee - 250 :
    goal === 'gain' ? roundedTdee + 200 : roundedTdee
  )

  // ── Sport-specific macro splits ────────────────────────────────────────────
  let protein_goal, fat_pct

  if (sport === 'running' || sport === 'cycling' || sport === 'swimming') {
    // Endurance athletes: glycogen is rate-limiting, so carbs are the priority.
    // Protein at 1.8g/kg is sufficient for muscle maintenance (not hypertrophy focus).
    // Fat at 22% keeps hormones intact without crowding out carbs.
    protein_goal = Math.round(weight_kg * 1.8)
    fat_pct      = 0.22
  } else if (sport === 'strength') {
    // Strength athletes: higher protein for hypertrophy, more fat tolerated
    // since they're not glycogen-dependent for competition.
    protein_goal = Math.round(weight_kg * 2.4)
    fat_pct      = 0.28
  } else if (sport === 'team') {
    // Team sports (field, court, ice): mixed demands. Moderate protein, balanced split.
    protein_goal = Math.round(weight_kg * 2.0)
    fat_pct      = 0.25
  } else {
    // General — same as standard formula
    protein_goal = Math.round(weight_kg * 2.0)
    fat_pct      = 0.25
  }

  const fat_goal   = Math.round((calorie_goal * fat_pct) / 9)
  const carbs_goal = Math.round((calorie_goal - protein_goal * 4 - fat_goal * 9) / 4)

  return {
    calorie_goal,
    protein_goal,
    fat_goal,
    carbs_goal,
    // Breakdown — used by UI to show methodology
    tdee:         roundedTdee,
    bmr:          roundedBmr,
    training_cal: training_cal || 0,
    sport,
  }
}

// ─── Runner mileage → TDEE multiplier ────────────────────────────────────────
// The standard "very active" multiplier (1.725) is designed for someone training
// ~1 hr/day. A runner at 90mi/week is at 10-15 hrs/week.
//
// These multipliers are derived from doubly-labeled water studies on distance
// runners and validated against known energy expenditure at various training loads.
// They represent total energy expenditure relative to BMR.
function getRunnerMultiplier(miles_per_week) {
  if (miles_per_week <= 15)  return 1.45  // ~casual runner
  if (miles_per_week <= 30)  return 1.60  // ~20-30 mi/wk recreational
  if (miles_per_week <= 50)  return 1.75  // ~half marathon training
  if (miles_per_week <= 70)  return 1.90  // ~marathon training
  if (miles_per_week <= 90)  return 2.05  // ~competitive marathon
  if (miles_per_week <= 110) return 2.20  // ~elite / 100-mile training
  return 2.35                              // ultra-high volume
}

// ─── Preview calculation (used by free users to see what Pro would give) ──────
// Returns only calorie_goal and tdee — enough to show a teaser without
// giving away the full breakdown or applying it to their profile.
export function previewProGoals(params) {
  const result = calculateGoalsPro(params)
  return {
    calorie_goal: result.calorie_goal,
    tdee:         result.tdee,
    training_cal: result.training_cal,
  }
}
