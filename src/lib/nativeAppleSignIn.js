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

// Native Sign in with Apple via Authentication Services.
// Nonce direction matters and fails silently if reversed: Apple gets the SHA256
// hash (it stamps that into the identity token); Supabase gets the RAW nonce
// (it hashes it and compares against the token claim).
// Apple returns givenName ONLY on the first authorization for this Apple ID and
// it is NEVER inside the identity token, so if we do not persist it here it is
// gone forever. Supabase's SIGNED_IN event fires before updateUser completes, so
// Onboarding reads the name via a metadata effect, not initial state.
export async function signInWithAppleNative() {
  const rawNonce    = randomHex()
  const hashedNonce = await sha256Hex(rawNonce)

  const { SignInWithApple } = await import('@capacitor-community/apple-sign-in')
  let result
  try {
    result = await SignInWithApple.authorize({
      // clientId/redirectURI are used by the plugin's web/Android paths and
      // ignored by the native iOS flow; set them to our real values anyway.
      clientId: 'net.truecalorie.auth',
      redirectURI: 'https://auth.truecalorie.net/auth/v1/callback',
      scopes: 'email name',
      state: randomHex(),
      nonce: hashedNonce,
    })
  } catch (err) {
    // ASAuthorizationError code 1001 = user dismissed the sheet. Not an error.
    const msg = String(err?.message || err?.code || err)
    if (msg.includes('1001') || /cancel/i.test(msg)) return { cancelled: true }
    return { error: 'Apple sign-in failed. Please try again.' }
  }

  const token = result?.response?.identityToken
  if (!token) return { error: 'Apple sign-in failed. Please try again.' }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token,
    nonce: rawNonce,
  })
  if (error) return { error: error.message }

  const givenName = result.response?.givenName
  if (givenName) {
    try { await supabase.auth.updateUser({ data: { display_name: givenName } }) } catch {}
  }
  return { ok: true }
}
