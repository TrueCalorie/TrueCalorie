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
  // Runner refinements
  training_phase  = 'build',
  run_type_split  = 'mixed',
  race_distance   = 'half_marathon',
  // Strength refinements
  lifting_days_week = 4,
  lifting_goal      = 'athletic',
}) {
  const bmr = sex === 'male'
    ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

  const roundedBmr = Math.round(bmr)
  let tdee, training_cal

  // ── Sport-aware TDEE ───────────────────────────────────────────────────────
  if (sport === 'running' && weekly_mileage > 0) {
    // Cal/mile by workout mix, phase factor scales the whole TDEE.
    // easy=100 cal/mi (mostly aerobic), mixed=108 (default, ~20% quality), hard=118 (>30% threshold)
    const calPerMile   = { easy: 100, mixed: 108, hard: 118 }[run_type_split] || 108
    const phaseFactors = { base: 0.95, build: 1.0, peak: 1.08, taper: 0.88, offseason: 0.90 }
    const phaseFactor  = phaseFactors[training_phase] || 1.0
    const base            = bmr * 1.3
    const dailyTrainingCal = (Number(weekly_mileage) / 7) * calPerMile
    tdee         = (base + dailyTrainingCal) * phaseFactor
    training_cal = Math.round(dailyTrainingCal * phaseFactor)

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

  } else if (sport === 'strength' && (training_hours_week > 0 || lifting_days_week > 0)) {
    // Use training_hours_week if provided; otherwise estimate 1.25 hrs/session from days/week
    const effectiveHours = Number(training_hours_week) > 0
      ? Number(training_hours_week)
      : (lifting_days_week || 4) * 1.25
    const daily_strength = (effectiveHours * 420) / 7
    const base           = bmr * 1.4
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
  let protein_goal, proteinPerKg, fat_pct

  if (sport === 'running') {
    // Race distance shifts carb priority: shorter events tolerate slightly more fat,
    // ultra runners need fat adaptation and slightly less protein (1.7 g/kg).
    if (race_distance === 'ultra') {
      proteinPerKg = 1.7; fat_pct = 0.22
    } else if (race_distance === 'marathon' || race_distance === '5k_10k') {
      proteinPerKg = 1.8; fat_pct = 0.20
    } else { // half_marathon (default)
      proteinPerKg = 1.8; fat_pct = 0.21
    }
    protein_goal = Math.round(weight_kg * proteinPerKg)
  } else if (sport === 'cycling' || sport === 'swimming') {
    proteinPerKg = 1.8; fat_pct = 0.22
    protein_goal = Math.round(weight_kg * proteinPerKg)
  } else if (sport === 'strength') {
    // Lifting goal shifts protein ceiling and fat tolerance.
    if (lifting_goal === 'hypertrophy') {
      proteinPerKg = 2.6; fat_pct = 0.28  // max muscle protein synthesis
    } else if (lifting_goal === 'strength') {
      proteinPerKg = 2.2; fat_pct = 0.30  // powerlifting: less protein, more fat tolerance
    } else { // athletic (default)
      proteinPerKg = 2.4; fat_pct = 0.28
    }
    protein_goal = Math.round(weight_kg * proteinPerKg)
  } else if (sport === 'team') {
    proteinPerKg = 2.0; fat_pct = 0.25
    protein_goal = Math.round(weight_kg * proteinPerKg)
  } else {
    proteinPerKg = 2.0; fat_pct = 0.25
    protein_goal = Math.round(weight_kg * proteinPerKg)
  }

  const fat_goal   = Math.round((calorie_goal * fat_pct) / 9)
  const carbs_goal = Math.round((calorie_goal - protein_goal * 4 - fat_goal * 9) / 4)

  // ── Rest-day baseline and training contribution ────────────────────────────
  // restDayBaseline: what the athlete should eat on a zero-training day.
  // estimatedDailyTraining: average daily calorie contribution from training load.
  // Identity: restDayBaseline + estimatedDailyTraining ≈ calorie_goal
  // (may differ by ±1 cal due to independent rounding; calorie_goal is authoritative).
  const goalAdjustment        = goal === 'lose' ? -250 : goal === 'gain' ? 200 : 0
  const restDayBaseline       = Math.round(bmr * 1.35) + goalAdjustment
  const estimatedDailyTraining = Math.max(0, Math.round(tdee - bmr * 1.35))

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
    // Step-2 fields: dynamic daily targets (Strava-aware ring)
    restDayBaseline,
    estimatedDailyTraining,
    proteinPerKg,
    fatPct: fat_pct,
  }
}

// ─── Macro calculator for arbitrary calorie target ───────────────────────────
// Recomputes protein/fat/carbs for any calorie value using the sport-specific
// ratios returned by calculateGoalsPro (proteinPerKg, fatPct).
// Used by step-2 dynamic targets: computeMacros(restDayCalories, weightKg, proteinPerKg, fatPct)
export function computeMacros(calories, weightKg, proteinPerKg, fatPct) {
  const protein = Math.round(weightKg * proteinPerKg)
  const fat     = Math.round((calories * fatPct) / 9)
  const carbs   = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4))
  return { protein, carbs, fat }
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
