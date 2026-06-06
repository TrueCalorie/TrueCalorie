import { Capacitor } from '@capacitor/core'

const isNative = Capacitor.isNativePlatform()

let Health = null
if (isNative) {
  import(/* @vite-ignore */ '@capgo/capacitor-health').then(m => { Health = m.Health }).catch(() => {})
}

export async function requestHealthKitPermissions() {
  if (!isNative || !Health) return false
  try {
    await Health.requestAuthorization({
      read: ['weight', 'workout'],
      write: ['weight']
    })
    return true
  } catch (e) {
    console.error('HealthKit permission error:', e)
    return false
  }
}

export async function syncWeightToHealthKit(weightKg, date = new Date()) {
  if (!isNative || !Health) return
  try {
    await Health.store({
      type: 'weight',
      value: weightKg,
      unit: 'kg',
      startDate: date.toISOString(),
      endDate: date.toISOString()
    })
  } catch (e) {
    console.error('HealthKit weight sync error:', e)
  }
}

export async function readWorkoutsFromHealthKit(days = 7) {
  if (!isNative || !Health) return []
  try {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    const result = await Health.query({
      type: 'workout',
      startDate: start.toISOString(),
      endDate: end.toISOString()
    })
    return result.values || []
  } catch (e) {
    console.error('HealthKit workout read error:', e)
    return []
  }
}
