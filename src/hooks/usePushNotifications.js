import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

function toLocalDateStr(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const isCapacitor = typeof window !== 'undefined' && !!(window.Capacitor)

export function usePushNotifications(session) {
  const isSupported = !isCapacitor
    && typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window

  const [isSubscribed,   setIsSubscribed]   = useState(false)
  const [isPromptReady,  setIsPromptReady]  = useState(false)
  const [reminderTime,   setReminderTime]   = useState('19:00')

  useEffect(() => {
    if (!isSupported || !session?.user?.id) return

    // Check browser-side push subscription
    navigator.serviceWorker.getRegistration('/sw-push.js').then(reg => {
      if (!reg) return
      reg.pushManager.getSubscription().then(sub => {
        if (sub) setIsSubscribed(true)
      })
    })

    // Fetch DB record for reminder_time and enabled flag
    supabase
      .from('push_subscriptions')
      .select('reminder_time, enabled')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setReminderTime(data.reminder_time || '19:00')
          if (!data.enabled) setIsSubscribed(false)
        }
      })

    // isPromptReady: user has logged on 3+ distinct days in the last 30 days
    const since = new Date()
    since.setDate(since.getDate() - 30)
    supabase
      .from('meal_logs')
      .select('logged_at')
      .eq('user_id', session.user.id)
      .gte('logged_at', since.toISOString())
      .then(({ data }) => {
        if (!data) return
        const days = new Set(data.map(r => toLocalDateStr(r.logged_at)))
        setIsPromptReady(days.size >= 3)
      })
  }, [isSupported, session?.user?.id])

  const subscribe = async () => {
    if (!isSupported) return
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    let reg = await navigator.serviceWorker.getRegistration('/sw-push.js')
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw-push.js')
      await navigator.serviceWorker.ready
    }

    const pushSub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const { data: { session: authSession } } = await supabase.auth.getSession()
    await fetch('/api/save-push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authSession?.access_token}`,
      },
      body: JSON.stringify({
        subscription:  pushSub.toJSON(),
        reminder_time: reminderTime,
        timezone:      Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    })

    setIsSubscribed(true)
  }

  const unsubscribe = async () => {
    const reg = await navigator.serviceWorker.getRegistration('/sw-push.js')
    if (reg) {
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
    }

    const { data: { session: authSession } } = await supabase.auth.getSession()
    await fetch('/api/save-push-subscription', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authSession?.access_token}` },
    })

    setIsSubscribed(false)
  }

  const updateReminderTime = async (time) => {
    setReminderTime(time)
    const { data: { session: authSession } } = await supabase.auth.getSession()
    await fetch('/api/save-push-subscription', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authSession?.access_token}`,
      },
      body: JSON.stringify({ reminder_time: time }),
    })
  }

  return { isSupported, isSubscribed, isPromptReady, reminderTime, subscribe, unsubscribe, updateReminderTime }
}
