import { useEffect } from 'react'

export default function Privacy({ onBack }) {
  useEffect(() => {
    window.scrollTo(0, 0)
    const els = document.querySelectorAll('.fade-up')
    els.forEach((el, i) => {
      el.style.opacity = 0
      el.style.transform = 'translateY(24px)'
      el.style.transition = `opacity 0.7s ease ${i * 0.08}s, transform 0.7s ease ${i * 0.08}s`
      setTimeout(() => {
        el.style.opacity = 1
        el.style.transform = 'translateY(0)'
      }, 50)
    })
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'sans-serif',
      overflowX: 'hidden',
    }}>

      {/* Nav */}
      <nav className="fade-up" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 32px',
        borderBottom: '1px solid #1f1f1f',
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'Georgia, serif' }}>
          TrueCalorie
        </span>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: '1px solid #333',
              color: '#aaa',
              padding: '8px 18px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = '#fff'; e.target.style.color = '#fff' }}
            onMouseLeave={e => { e.target.style.borderColor = '#333'; e.target.style.color = '#aaa' }}
          >
            ← Back
          </button>
        )}
      </nav>

      {/* Content */}
      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '60px 32px 80px',
        lineHeight: 1.7,
      }}>
        <div className="fade-up">
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 40 }}>
            Last updated: June 10, 2026
          </p>
        </div>

        <Section title="Overview">
          <p>
            TrueCalorie LLC ("TrueCalorie," "we," "us") operates the website
            truecalorie.net and the TrueCalorie mobile application
            (collectively, the "Service"). This Privacy Policy explains what
            information we collect, how we use it, and the choices you have.
          </p>
          <p>
            By using the Service, you agree to the collection and use of
            information in accordance with this policy.
          </p>
        </Section>

        <Section title="Information We Collect">
          <p><strong style={{ color: '#fff' }}>Account information.</strong> When you create an account, we collect
            your email address, display name, and authentication credentials.
            If you sign in with Google, we receive your email address and basic
            profile information from Google.</p>
          <p><strong style={{ color: '#fff' }}>Profile information.</strong> During onboarding, you may provide
            information such as your age, height, weight, activity level, and
            fitness goals. This information is used solely to calculate your
            personalized calorie and macronutrient targets.</p>
          <p><strong style={{ color: '#fff' }}>Usage information.</strong> When you log meals or use the Service,
            we collect the data you enter — including food items, restaurants,
            timestamps, and nutritional values — so we can display your
            tracking history and progress.</p>
          <p><strong style={{ color: '#fff' }}>Payment information.</strong> If you purchase a Founders'
            Membership or subscribe to Pro, payment is processed by Stripe.
            We do not store your credit card information; we receive only
            limited transaction details (such as your email, amount paid, and
            subscription status) from Stripe.</p>
          <p><strong style={{ color: '#fff' }}>Technical information.</strong> We may automatically collect
            limited technical information when you use the Service, including
            your IP address, device type, browser, and the times you access
            the Service. This is used for security, debugging, and to keep
            the Service running reliably.</p>
        </Section>

        <Section title="How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul style={{ paddingLeft: 20, color: '#bbb' }}>
            <li>Provide and personalize the Service (calculating your calorie targets, displaying your meal history, awarding achievements)</li>
            <li>Authenticate you and keep your account secure</li>
            <li>Process payments and manage subscriptions</li>
            <li>Communicate with you about your account or important Service updates</li>
            <li>Detect and prevent fraud, abuse, or security issues</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>
            We do not sell your personal information to third parties. We do
            not use your information for advertising purposes.
          </p>
        </Section>

        <Section title="Service Providers">
          <p>
            We use trusted third-party service providers to operate the
            Service. These providers process your information only as needed
            to provide their services to us:
          </p>
          <ul style={{ paddingLeft: 20, color: '#bbb' }}>
            <li><strong style={{ color: '#fff' }}>Supabase</strong> — database and authentication infrastructure</li>
            <li><strong style={{ color: '#fff' }}>Vercel</strong> — website hosting and serverless functions</li>
            <li><strong style={{ color: '#fff' }}>Stripe</strong> — payment processing</li>
            <li><strong style={{ color: '#fff' }}>Google</strong> — sign-in (if you choose to use Google authentication)</li>
            <li><strong style={{ color: '#fff' }}>Apple</strong> — sign-in (if you choose to use Apple authentication)</li>
            <li><strong style={{ color: '#fff' }}>Open Food Facts and Nutritionix</strong> — nutrition data lookup (we send your search queries; they do not receive your account information)</li>
            <li><strong style={{ color: '#fff' }}>PostHog</strong> — product analytics. We use PostHog to understand how users interact with the app (for example, which features are used and where users encounter errors). PostHog does not receive your food log data or health information.</li>
          </ul>
          <p>
            We may use additional analytics or operational tools in the
            future. If we do, we will update this Privacy Policy and the
            services will be listed here.
          </p>
        </Section>

        <Section title="Data Retention">
          <p>
            We retain your account information and meal history for as long
            as your account is active. If you delete your account, your
            personal data is removed from our active systems within 30 days.
            Some information may be retained longer if required for legal,
            tax, accounting, or fraud-prevention purposes.
          </p>
        </Section>

        <Section title="Your Rights">
          <p>You have the right to:</p>
          <ul style={{ paddingLeft: 20, color: '#bbb' }}>
            <li>Access the personal information we have about you</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your account and associated data</li>
            <li>Export your data in a portable format</li>
            <li>Withdraw consent for any optional data processing</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at
            support@truecalorie.net. We will respond within 30 days.
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p>
            TrueCalorie is not intended for children under the age of 13. We
            do not knowingly collect personal information from children under
            13. If you believe a child has provided us with personal
            information, please contact us and we will delete it.
          </p>
        </Section>

        <Section title="Security">
          <p>
            We use industry-standard measures to protect your information,
            including encrypted connections (HTTPS), encrypted storage,
            authentication tokens, and Row Level Security on our database.
            No method of transmission or storage is 100% secure, but we work
            to follow current best practices.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. If we make
            material changes, we will notify you by email or by posting a
            prominent notice in the Service. The "Last updated" date at the
            top of this page reflects the most recent revision.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this Privacy Policy?
            Email <a href="mailto:support@truecalorie.net" style={{ color: '#1D9E75' }}>support@truecalorie.net</a>.
          </p>
          <p style={{ marginTop: 16, fontSize: 13, color: '#777' }}>
            TrueCalorie LLC<br />
            Parker, Colorado, USA
          </p>
        </Section>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid #1a1a1a',
        padding: '24px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 13, color: '#333' }}>© 2026 TrueCalorie LLC</span>
        <span style={{ fontSize: 12, color: '#333' }}>
          <a href="/privacy" style={{ color: '#444', textDecoration: 'none', marginRight: 16 }}>Privacy</a>
          <a href="/terms" style={{ color: '#444', textDecoration: 'none' }}>Terms</a>
        </span>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="fade-up" style={{ marginBottom: 32 }}>
      <h2 style={{
        fontSize: 18,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        marginBottom: 12,
        color: '#fff',
      }}>
        {title}
      </h2>
      <div style={{ color: '#bbb', fontSize: 15 }}>
        {children}
      </div>
    </div>
  )
}