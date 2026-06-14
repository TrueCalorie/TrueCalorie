import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { usePro } from './hooks/usePro'
import { usePushNotifications } from './hooks/usePushNotifications'
import StravaConnect from './components/StravaConnect'
import { openExternal } from './lib/openExternal'
import { apiFetch } from './lib/apiFetch'

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
      color: 'var(--muted)', textTransform: 'uppercase',
      marginBottom: 8, padding: '0 4px',
    }}>
      {children}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  )
}

function Row({ label, children, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 16px',
      borderBottom: last ? 'none' : '1px solid var(--border)',
      gap: 12,
    }}>
      <span style={{ fontSize: 15, color: 'var(--text)', flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  )
}

function Segmented({ value, onChange, options }) {
  return (
    <div style={{
      display: 'flex', background: 'var(--surface2)',
      borderRadius: 8, padding: 2, gap: 2,
    }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: '5px 12px', borderRadius: 6, border: 'none',
            background: value === o.value ? 'var(--text)' : 'transparent',
            color: value === o.value ? 'var(--bg)' : 'var(--muted)',
            fontSize: 12, fontWeight: value === o.value ? 600 : 400,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s, color 0.15s',
          }}
        >{o.label}</button>
      ))}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 12, flexShrink: 0,
        background: value ? '#1D9E75' : 'var(--surface2)',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 10,
        background: 'white', transition: 'left 0.2s',
        left: value ? 22 : 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Settings({ session, settings, onUpdate, onClose, onNavigate }) {
  const { isPro, isTrialing, trialDaysLeft, loading, source, expiresAt, cancelAtPeriodEnd } = usePro()
  const isProUser    = isPro || isTrialing
  const isFounder    = source === 'founder'
  const isMonthlyPro = isPro && !isTrialing && source === 'monthly'

  const {
    isSupported: pushSupported, isSubscribed, isPromptReady,
    reminderTime, subscribe, unsubscribe, updateReminderTime,
  } = usePushNotifications(session)

  const [form, setForm] = useState({
    calorie_goal: settings?.calorie_goal || 2000,
    protein_goal: settings?.protein_goal || 150,
    carbs_goal:   settings?.carbs_goal   || 250,
    fat_goal:     settings?.fat_goal     || 65,
  })

  // Keep nutrition goal form in sync when BodyFitnessPage applies calculated targets
  useEffect(() => {
    setForm(f => ({
      ...f,
      calorie_goal: settings?.calorie_goal ?? f.calorie_goal,
      protein_goal: settings?.protein_goal ?? f.protein_goal,
      carbs_goal:   settings?.carbs_goal   ?? f.carbs_goal,
      fat_goal:     settings?.fat_goal     ?? f.fat_goal,
    }))
  }, [settings?.calorie_goal, settings?.protein_goal, settings?.carbs_goal, settings?.fat_goal])

  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError]     = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError]     = useState(null)
  const [currentTheme, setCurrentThemeState] = useState(
    () => localStorage.getItem('tc-theme') || 'system'
  )

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const setTheme = (val) => {
    setCurrentThemeState(val)
    localStorage.setItem('tc-theme', val)
    const root = document.documentElement
    if (val === 'dark')   { root.setAttribute('data-theme', 'dark') }
    else if (val === 'light') { root.setAttribute('data-theme', 'light') }
    else { root.removeAttribute('data-theme') }
  }

  const save = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('user_settings')
      .update({
        calorie_goal: parseInt(form.calorie_goal),
        protein_goal: parseInt(form.protein_goal),
        carbs_goal:   parseInt(form.carbs_goal),
        fat_goal:     parseInt(form.fat_goal),
      })
      .eq('user_id', session.user.id)

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      if (onUpdate) onUpdate()
    }
  }

  const openPortal = async () => {
    setPortalLoading(true)
    setPortalError(null)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res  = await apiFetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data?.url) openExternal(data.url)
      else setPortalError(data?.error || 'Something went wrong. Try again.')
    } catch {
      setPortalError('Something went wrong. Try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  const deleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res = await apiFetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        await supabase.auth.signOut()
      } else {
        setDeleteError(data?.error || 'Something went wrong. Try again.')
      }
    } catch {
      setDeleteError('Something went wrong. Try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const renewDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const goalInputStyle = (key) => ({
    type:     'number',
    value:    form[key],
    onChange: e => update(key, e.target.value),
    style: {
      width: 72, textAlign: 'right',
      background: 'none',
      border: 'none', outline: 'none', fontSize: 15, color: 'var(--text)',
      fontFamily: 'inherit', padding: 0, borderRadius: 4,
      MozAppearance: 'textfield',
    },
  })

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--bg)', minHeight: '100vh', fontFamily: 'inherit' }}>

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', paddingTop: 'calc(16px + env(safe-area-inset-top))', paddingRight: 16, paddingBottom: 14, paddingLeft: 16,
        borderBottom: '1px solid var(--border)', position: 'sticky', top: 0,
        background: 'var(--bg)', zIndex: 1,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--text)', fontSize: 20, lineHeight: 1, marginRight: 12,
        }}>←</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', flex: 1 }}>
          Settings
        </span>
        <button onClick={save} disabled={saving} style={{
          background: 'none', border: 'none', fontSize: 15, fontWeight: 600,
          color: saved ? '#22c55e' : 'var(--accent)',
          cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
          padding: '4px 8px', transition: 'color 0.2s', opacity: saving ? 0.5 : 1,
        }}>
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div style={{ padding: '20px 16px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── SUBSCRIPTION ───────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Subscription</SectionLabel>
          <Card>
            <button onClick={() => onNavigate?.('subscription')} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderBottom: isMonthlyPro ? '1px solid var(--border)' : 'none',
              opacity: loading ? 0 : 1, transition: 'opacity 0.3s',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>Plan</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {isFounder && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                      color: '#1D9E75', background: 'rgba(29,158,117,0.1)',
                      border: '1px solid rgba(29,158,117,0.25)',
                      borderRadius: 4, padding: '2px 6px',
                    }}>FOUNDER</span>
                  )}
                  {isPro && !isFounder && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                      color: '#1D9E75', background: 'rgba(29,158,117,0.1)',
                      border: '1px solid rgba(29,158,117,0.25)',
                      borderRadius: 4, padding: '2px 6px',
                    }}>PRO</span>
                  )}
                  {isTrialing && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                      color: '#f5a623', background: 'rgba(245,166,35,0.1)',
                      border: '1px solid rgba(245,166,35,0.25)',
                      borderRadius: 4, padding: '2px 6px',
                    }}>TRIAL · {trialDaysLeft}d left</span>
                  )}
                  {!isPro && !isTrialing && !loading && (
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Free</span>
                  )}
                </div>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 16, opacity: 0.4 }}>›</span>
            </button>

            {isMonthlyPro && (
              <div>
                {renewDate && (
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--muted)' }}>
                    {cancelAtPeriodEnd ? `Pro until ${renewDate}, won't renew` : `Renews ${renewDate}`}
                  </div>
                )}
                <button onClick={openPortal} disabled={portalLoading} style={{
                  width: '100%', padding: '13px 16px', background: 'none', border: 'none',
                  borderBottom: 'none', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', cursor: portalLoading ? 'default' : 'pointer',
                  fontFamily: 'inherit', opacity: portalLoading ? 0.6 : 1,
                }}>
                  <span style={{ fontSize: 15, color: 'var(--text)' }}>
                    {portalLoading ? 'Opening…' : 'Manage billing'}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: 16, opacity: 0.5 }}>›</span>
                </button>
                {portalError && (
                  <p style={{ fontSize: 12, color: '#ef4444', padding: '0 16px 12px', margin: 0 }}>
                    {portalError}
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* ── NUTRITION GOALS ─────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Nutrition Goals</SectionLabel>
          <Card>
            <Row label="Calories">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input {...goalInputStyle('calorie_goal')} style={{ ...goalInputStyle('calorie_goal').style, width: 80 }} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>cal</span>
              </div>
            </Row>
            <Row label="Protein">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input {...goalInputStyle('protein_goal')} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>g</span>
              </div>
            </Row>
            <Row label="Carbs">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input {...goalInputStyle('carbs_goal')} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>g</span>
              </div>
            </Row>
            <Row label="Fat" last>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input {...goalInputStyle('fat_goal')} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>g</span>
              </div>
            </Row>
          </Card>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, padding: '0 4px' }}>
            Edit manually, or use the calculators below to set targets from your profile.
          </p>
        </div>

        {/* ── BODY & FITNESS ──────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Body & Fitness</SectionLabel>
          <Card>
            <button onClick={() => onNavigate?.('body-fitness')} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '14px 16px', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}>
              <span style={{ fontSize: 15, color: 'var(--text)' }}>Profile, targets, sport</span>
              <span style={{ color: 'var(--muted)', fontSize: 16, opacity: 0.4 }}>›</span>
            </button>
          </Card>
        </div>

        {/* ── INTEGRATIONS ── */}
        <div>
          <SectionLabel>Integrations</SectionLabel>
          <Card style={{ padding: 0 }}>
            <StravaConnect session={session} />
          </Card>
        </div>

        {/* ── APPEARANCE ──────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Appearance</SectionLabel>
          <Card>
            <Row label="Theme" last>
              <Segmented value={currentTheme} onChange={setTheme}
                options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
            </Row>
          </Card>
        </div>

        {/* ── NOTIFICATIONS ───────────────────────────────────────────────── */}
        {pushSupported && (
          <div>
            <SectionLabel>Notifications</SectionLabel>
            <Card>
              {!isPromptReady ? (
                <div style={{ padding: '13px 16px' }}>
                  <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 2 }}>Enable reminders</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Available after 3 logged days</div>
                </div>
              ) : !isSubscribed ? (
                <button onClick={subscribe} style={{
                  width: '100%', padding: '13px 16px', background: 'none', border: 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}>
                  <span style={{ fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>Enable reminders</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Get a nudge if you haven't logged by evening</span>
                </button>
              ) : (
                <>
                  <Row label="Reminder time">
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={e => updateReminderTime(e.target.value)}
                      style={{
                        background: 'none', border: 'none', outline: 'none',
                        fontSize: 15, color: 'var(--text)', fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    />
                  </Row>
                  <Row label="Daily reminder" last>
                    <Toggle value={true} onChange={unsubscribe} />
                  </Row>
                </>
              )}
            </Card>
          </div>
        )}

        {/* ── ACCOUNT ──────────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Account</SectionLabel>
          <Card>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Signed in as</div>
              <div style={{ fontSize: 14, color: 'var(--text)' }}>{session.user.email}</div>
            </div>
            {[
              { label: 'Sign out',        action: () => supabase.auth.signOut() },
              { label: 'Privacy Policy',  action: () => window.open('/privacy', '_blank') },
              { label: 'Terms of Service', action: () => window.open('/terms', '_blank') },
            ].map((item, i, arr) => (
              <button key={item.label} onClick={item.action} style={{
                width: '100%', padding: '13px 16px', background: 'none', border: 'none',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <span style={{ fontSize: 15, color: 'var(--text)' }}>{item.label}</span>
                <span style={{ color: 'var(--muted)', fontSize: 16, opacity: 0.4 }}>›</span>
              </button>
            ))}

            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} style={{
                width: '100%', padding: '13px 16px', background: 'none', border: 'none',
                borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <span style={{ fontSize: 15, color: '#E24B4A' }}>Delete account</span>
              </button>
            ) : (
              <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
                  This permanently deletes your account and all your data. This cannot be undone.
                </p>
                <input
                  type="text"
                  placeholder="Type DELETE to confirm"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', marginBottom: 10,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text)', fontSize: 16,
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={deleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                  style={{
                    width: '100%', padding: 11, marginBottom: 8,
                    background: deleteConfirmText === 'DELETE' && !deleteLoading ? '#E24B4A' : 'var(--surface2)',
                    border: 'none', borderRadius: 8,
                    color: deleteConfirmText === 'DELETE' && !deleteLoading ? '#fff' : 'var(--muted)',
                    fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                    cursor: deleteConfirmText === 'DELETE' && !deleteLoading ? 'pointer' : 'default',
                  }}
                >
                  {deleteLoading ? 'Deleting...' : 'Permanently delete account'}
                </button>
                {deleteError && (
                  <p style={{ fontSize: 12, color: '#E24B4A', marginBottom: 8 }}>{deleteError}</p>
                )}
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteError(null) }}
                  style={{
                    width: '100%', padding: '8px', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: 13, color: 'var(--muted)', fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </Card>
        </div>

        <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: -8 }}>
          TrueCalorie · truecalorie.net
        </p>

      </div>

    </div>
  )
}
