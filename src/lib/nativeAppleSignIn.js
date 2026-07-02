import { supabase } from '../supabase'

function randomHex(bytes = 16) {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(str) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

let initialized = false
async function getPlugin() {
  const { SocialLogin } = await import('@capgo/capacitor-social-login')
  if (!initialized) {
    // clientId is only read by the plugin's web/Android paths; redirectUrl '' is the
    // documented iOS setting to prevent any redirect-based fallback.
    await SocialLogin.initialize({ apple: { clientId: 'net.truecalorie.auth', redirectUrl: '' } })
    initialized = true
  }
  return SocialLogin
}

// Native Sign in with Apple via Authentication Services (@capgo/capacitor-social-login).
// Nonce direction matters and fails silently if reversed: the plugin passes the nonce
// RAW into ASAuthorizationAppleIDRequest (verified in its AppleProvider.swift), so Apple
// must receive the SHA256 hash and Supabase must receive the RAW nonce.
// Apple returns givenName ONLY on the first authorization and it is NEVER inside the
// identity token, so persist it here or it is gone. SIGNED_IN fires before updateUser
// completes, so Onboarding reads the name via its metadata effect, not initial state.
export async function signInWithAppleNative() {
  const rawNonce    = randomHex()
  const hashedNonce = await sha256Hex(rawNonce)

  let res
  try {
    const SocialLogin = await getPlugin()
    res = await SocialLogin.login({
      provider: 'apple',
      options: { scopes: ['name', 'email'], nonce: hashedNonce },
    })
  } catch (err) {
    // The plugin marks user cancellation with a USER_CANCELLED code; the regex also
    // covers raw ASAuthorizationError 1001 and both cancelled/canceled spellings.
    const blob = `${err?.code || ''} ${err?.message || err}`
    if (/cancel/i.test(blob) || blob.includes('1001')) return { cancelled: true }
    return { error: 'Apple sign-in failed. Please try again.' }
  }

  const token = res?.result?.idToken
  if (!token) return { error: 'Apple sign-in failed. Please try again.' }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token,
    nonce: rawNonce,
  })
  if (error) return { error: error.message }

  const givenName = res.result?.profile?.givenName
  if (givenName) {
    try { await supabase.auth.updateUser({ data: { display_name: givenName } }) } catch {}
  }
  return { ok: true }
}
