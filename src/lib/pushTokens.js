// src/lib/pushTokens.js
// Device token registration for Fuel Coach push (Phase 1: store tokens only;
// APNs delivery is Phase 2 after the MacinCloud entitlement pass).
//
// Called from the Today screen once a brief EXISTS — the permission prompt
// lands when the user can see what notifications are for, never at signup.
// Native only; every failure path degrades silently. Briefs always surface
// in-app regardless.
//
// device_tokens RLS lets users manage their own rows; upsert on (token) with
// user_id overwrite handles a device switching accounts.

import { supabase } from '../supabase'

let attempted = false

export async function ensurePushRegistration(userId) {
  if (attempted || !userId) return
  if (!window.Capacitor?.isNativePlatform?.()) return
  attempted = true

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === 'prompt') {
      perm = await PushNotifications.requestPermissions()
    }
    if (perm.receive !== 'granted') return // denied: silent, in-app only

    await PushNotifications.addListener('registration', async ({ value }) => {
      try {
        await supabase.from('device_tokens').upsert({
          token:        value,
          user_id:      userId,
          platform:     window.Capacitor.getPlatform(), // 'ios' | 'android'
          last_seen_at: new Date().toISOString(),
        }, { onConflict: 'token' })
      } catch {}
    })
    await PushNotifications.addListener('registrationError', () => {
      // Silent: no APNs entitlement yet on current binaries; expected until
      // the Phase 2 native build.
    })

    await PushNotifications.register()
  } catch {
    // Plugin missing from the installed binary (pre-Phase-2 builds) or any
    // other failure: silent by design.
  }
}
