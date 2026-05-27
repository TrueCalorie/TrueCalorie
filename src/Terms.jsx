import { useEffect } from 'react'

export default function Terms({ onBack }) {
  useEffect(() => {
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
            }}
            onMouseEnter={e => { e.target.style.borderColor = '#fff'; e.target.style.color = '#fff' }}
            onMouseLeave={e => { e.target.style.borderColor = '#333'; e.target.style.color = '#aaa' }}
          >
            ← Back
          </button>
        )}
      </nav>

      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '60px 32px 80px',
        lineHeight: 1.7,
      }}>
        <div className="fade-up">
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 40 }}>
            Last updated: May 26, 2026
          </p>
        </div>

        <Section title="Agreement">
          <p>
            Welcome to TrueCalorie. These Terms of Service ("Terms") govern
            your access to and use of the TrueCalorie website (truecalorie.net)
            and mobile application (collectively, the "Service") operated by
            TrueCalorie LLC ("TrueCalorie," "we," "us").
          </p>
          <p>
            By creating an account or using the Service, you agree to be bound
            by these Terms. If you do not agree, do not use the Service.
          </p>
        </Section>

        <Section title="Eligibility">
          <p>
            You must be at least 13 years old to use TrueCalorie. By using
            the Service, you represent that you meet this requirement and
            that you have the legal capacity to enter into these Terms.
          </p>
        </Section>

        <Section title="Your Account">
          <p>
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activity that occurs under your
            account. Notify us promptly at triguy805@gmail.com if you suspect
            unauthorized access.
          </p>
          <p>
            You may not share your account, create multiple accounts to abuse
            free tiers, or impersonate another person.
          </p>
        </Section>

        <Section title="Acceptable Use">
          <p>You agree not to:</p>
          <ul style={{ paddingLeft: 20, color: '#bbb' }}>
            <li>Use the Service for any unlawful purpose</li>
            <li>Reverse-engineer, scrape, or interfere with the Service or its underlying systems</li>
            <li>Attempt to access another user's account or data</li>
            <li>Upload content that is harmful, harassing, or violates someone else's rights</li>
            <li>Use the Service to develop a competing product</li>
          </ul>
        </Section>

        <Section title="Subscriptions and Payments">
          <p>
            TrueCalorie offers paid subscriptions including a Founders'
            Membership and a Pro subscription. Payments are processed by
            Stripe. By purchasing a subscription, you authorize us (through
            Stripe) to charge the payment method you provide.
          </p>
          <p>
            Subscriptions automatically renew at the end of each billing
            period unless cancelled before renewal. You can cancel anytime
            through your account settings or by contacting us. Cancellations
            take effect at the end of the current paid period; you retain
            access until that period ends.
          </p>
          <p>
            <strong style={{ color: '#fff' }}>Founders' Membership refund policy:</strong> If we do not launch
            Pro features by the end of Q4 2026, all Founders' Memberships are
            eligible for a full refund.
          </p>
        </Section>

        <Section title="Nutritional Information Disclaimer">
          <p>
            TrueCalorie provides nutrition tracking tools and information
            sourced from third-party databases (Open Food Facts, Nutritionix,
            and others). Nutritional values are estimates and may not be
            exact. The Service is not a substitute for professional medical
            advice, diagnosis, or treatment. Always consult a qualified
            healthcare provider before making significant changes to your
            diet, particularly if you have any medical conditions.
          </p>
          <p>
            We do not guarantee any particular health outcome from using
            the Service.
          </p>
        </Section>

        <Section title="Intellectual Property">
          <p>
            The Service, including its design, code, branding, and content
            created by us, is owned by TrueCalorie LLC and protected by
            copyright, trademark, and other intellectual property laws.
            You receive a limited, non-exclusive, non-transferable right to
            use the Service for personal purposes.
          </p>
          <p>
            You retain ownership of the data you enter (your meal logs,
            profile information, etc.). By using the Service, you grant us
            a limited license to use that data solely to provide the Service
            to you.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You may stop using the Service and delete your account at any
            time. We may suspend or terminate your account if you violate
            these Terms, if required by law, or if your use of the Service
            creates risk for us or other users.
          </p>
        </Section>

        <Section title="Disclaimers">
          <p>
            The Service is provided "as is" and "as available," without
            warranties of any kind, express or implied, including
            warranties of merchantability, fitness for a particular purpose,
            or non-infringement.
          </p>
          <p>
            We do not warrant that the Service will be uninterrupted,
            error-free, secure, or that any defects will be corrected.
          </p>
        </Section>

        <Section title="Limitation of Liability">
          <p>
            To the maximum extent permitted by law, TrueCalorie LLC and its
            owners, employees, and contractors will not be liable for any
            indirect, incidental, consequential, special, or punitive
            damages arising from or related to your use of the Service.
          </p>
          <p>
            Our total liability to you for any claim related to the Service
            will not exceed the amount you paid us in the 12 months prior
            to the event giving rise to the claim, or $100 if you have
            not paid us anything.
          </p>
        </Section>

        <Section title="Governing Law">
          <p>
            These Terms are governed by the laws of the State of Colorado,
            United States, without regard to its conflict of law principles.
            Any dispute arising from these Terms or the Service will be
            resolved exclusively in the state or federal courts located in
            Colorado, and you consent to the jurisdiction of those courts.
          </p>
        </Section>

        <Section title="Changes to These Terms">
          <p>
            We may update these Terms from time to time. If we make material
            changes, we will notify you by email or in-app notice. Continued
            use of the Service after the changes take effect constitutes
            acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these Terms?
            Email <a href="mailto:triguy805@gmail.com" style={{ color: '#1D9E75' }}>triguy805@gmail.com</a>.
          </p>
          <p style={{ marginTop: 16, fontSize: 13, color: '#777' }}>
            TrueCalorie LLC<br />
            Parker, Colorado, USA
          </p>
        </Section>
      </div>

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