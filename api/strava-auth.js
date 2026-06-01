// api/strava-auth.js
// Redirects the user to Strava's OAuth authorization page.
// Called from frontend: window.location.href = `/api/strava-auth?userId=${session.user.id}`
// The userId is passed as `state` so strava-callback.js can link the account.

export default function handler(req, res) {
  const clientId    = process.env.STRAVA_CLIENT_ID
  const redirectUri = `${process.env.VITE_APP_URL || 'https://truecalorie.net'}/api/strava-callback`
  const { userId }  = req.query

  if (!userId) {
    return res.status(400).json({ error: 'userId required' })
  }

  const params = new URLSearchParams({
    client_id:       clientId,
    redirect_uri:    redirectUri,
    response_type:   'code',
    approval_prompt: 'auto',
    scope:           'read,activity:read',
    state:           userId,  // passed back to callback to identify the user
  })

  res.redirect(302, `https://www.strava.com/oauth/authorize?${params}`)
}
