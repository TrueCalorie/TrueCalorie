// Generates an Apple "Sign in with Apple" client secret JWT.
//
// Reads four environment variables:
//   APPLE_TEAM_ID     — your 10-character Apple Developer Team ID
//   APPLE_KEY_ID      — the Key ID of the .p8 signing key
//   APPLE_SERVICE_ID  — the Services ID (used as the OAuth client_id)
//   APPLE_P8_PATH     — path to the downloaded AuthKey_XXXXXXXXXX.p8 file
//
// Prints only the signed JWT to stdout. Apple caps the client secret
// lifetime at 6 months; we use 180 days minus one hour for safety margin.
//
// Run (PowerShell, env vars inline):
//   $env:APPLE_TEAM_ID="TEAMID1234"; $env:APPLE_KEY_ID="KEYID12345"; `
//   $env:APPLE_SERVICE_ID="net.truecalorie.signin"; `
//   $env:APPLE_P8_PATH="C:\path\to\AuthKey_KEYID12345.p8"; `
//   node scripts/gen-apple-secret.mjs

import { readFileSync } from 'node:fs'
import { importPKCS8, SignJWT } from 'jose'

const required = ['APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_SERVICE_ID', 'APPLE_P8_PATH']
const missing = required.filter((name) => !process.env[name])
if (missing.length) {
  console.error(`Missing required environment variable(s): ${missing.join(', ')}`)
  process.exit(1)
}

const { APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICE_ID, APPLE_P8_PATH } = process.env

let pem
try {
  pem = readFileSync(APPLE_P8_PATH, 'utf8')
} catch (err) {
  console.error(`Could not read .p8 file at APPLE_P8_PATH (${APPLE_P8_PATH}): ${err.message}`)
  process.exit(1)
}

const privateKey = await importPKCS8(pem, 'ES256')

const now = Math.floor(Date.now() / 1000)
const exp = now + 180 * 24 * 60 * 60 - 60 * 60 // 180 days minus one hour

const jwt = await new SignJWT({})
  .setProtectedHeader({ alg: 'ES256', kid: APPLE_KEY_ID })
  .setIssuer(APPLE_TEAM_ID)
  .setSubject(APPLE_SERVICE_ID)
  .setAudience('https://appleid.apple.com')
  .setIssuedAt(now)
  .setExpirationTime(exp)
  .sign(privateKey)

console.log(jwt)
