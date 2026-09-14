import type { SVGProps } from 'react'
import { Link } from 'react-router-dom'
import ChatWidget from '../widget/ChatWidget'
import { useAuth } from '../auth/AuthContext'

type IconProps = SVGProps<SVGSVGElement>

function iconProps(props: IconProps): IconProps {
  return {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...props,
  }
}

function ChatIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.35 0-2.62-.32-3.73-.9L4 21l1.05-4.2A8.46 8.46 0 0 1 3.5 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" />
    </svg>
  )
}

function SearchIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function SparkleIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  )
}

function HandoffIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="8" cy="8" r="3" />
      <path d="M2 20c0-3 2.7-5 6-5s6 2 6 5" />
      <path d="M15 8h7M19 5l3 3-3 3" />
    </svg>
  )
}

function ShieldIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 3 4.5 6v6c0 4.5 3 7.5 7.5 9 4.5-1.5 7.5-4.5 7.5-9V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function LayersIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
      <path d="m4 12 8 4.5 8-4.5" />
      <path d="m4 16.5 8 4.5 8-4.5" />
    </svg>
  )
}

function AlertIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  )
}

function PulseIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  )
}

function MailIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  )
}

function GridIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  )
}

const STEPS = [
  {
    icon: ChatIcon,
    title: 'Ask a question',
    body: 'A customer types into the chat widget — no account or ticket number needed.',
  },
  {
    icon: SearchIcon,
    title: 'AI searches your docs',
    body: 'A pgvector similarity search pulls the most relevant chunks from your ingested knowledge base.',
  },
  {
    icon: SparkleIcon,
    title: 'Instant, grounded answer',
    body: 'The LLM answers using only that retrieved context — no guessing, no hallucinated policy details.',
  },
  {
    icon: HandoffIcon,
    title: 'Escalates when unsure',
    body: 'Low-confidence answers automatically flip the ticket to escalated for a human agent to pick up.',
  },
]

const FEATURES = [
  {
    icon: ShieldIcon,
    title: 'RAG-grounded answers',
    body: 'Every reply is built from real chunks of your own documents, retrieved by cosine similarity — not the model improvising.',
  },
  {
    icon: LayersIcon,
    title: 'Multi-provider LLM support',
    body: 'OpenAI, Anthropic, or Groq, swapped with one environment variable — no code changes to switch providers.',
  },
  {
    icon: AlertIcon,
    title: 'Confidence-based escalation',
    body: 'When retrieval confidence drops below threshold, or nothing relevant is found, the ticket is flagged for a human.',
  },
  {
    icon: PulseIcon,
    title: 'Sentiment-aware triage',
    body: "Every customer message is scored, and each ticket rolls up to its worst-case sentiment so frustrated customers surface first.",
  },
  {
    icon: MailIcon,
    title: 'Email-to-ticket automation',
    body: 'The support inbox is polled automatically — new emails become tickets with an AI-generated summary attached.',
  },
  {
    icon: GridIcon,
    title: 'Agent dashboard',
    body: 'A real-time ticket queue with status/priority/sentiment filters, reply and resolve flows, and role-based visibility.',
  },
]

export default function HomePage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="home-page">
      <header className="home-header">
        <Link to="/" className="home-logo">
          Customer Support Desk
        </Link>
        {isAuthenticated ? (
          <Link to="/dashboard" className="btn-secondary">
            Go to dashboard
          </Link>
        ) : (
          <Link to="/login" className="btn-secondary">
            Agent login
          </Link>
        )}
      </header>

      <section className="home-hero">
        <span className="home-eyebrow">AI Customer Support Platform</span>
        <h1>AI-powered support that resolves tickets instantly</h1>
        <p className="home-hero__subtitle">
          Grounded, RAG-powered answers pulled straight from your own documentation — and a real
          human the moment confidence drops. No canned bots guessing at policy.
        </p>
        <div className="home-hero__ctas">
          <a href="#demo" className="btn-primary">
            Try the demo
          </a>
          <Link to="/login" className="btn-secondary">
            Agent login
          </Link>
        </div>
      </section>

      <section className="home-section" id="demo">
        <div className="home-demo">
          <div className="home-demo__intro">
            <h2>Try it yourself</h2>
            <p>
              This is the exact chat widget customers use in production — ask a real question and
              watch it search, answer, and know when to hand off to a person.
            </p>
            <ul className="home-demo__hints">
              <li>
                Try: <strong>&ldquo;What are your support hours?&rdquo;</strong>
              </li>
              <li>
                Try: <strong>&ldquo;How do I get a refund?&rdquo;</strong> to see an escalation
              </li>
            </ul>
          </div>
          <div className="home-demo__widget">
            <ChatWidget />
          </div>
        </div>
      </section>

      <section className="home-section home-section--muted">
        <div className="home-section__header">
          <h2>How it works</h2>
          <p>From a typed question to a grounded answer — or a human handoff — in four steps.</p>
        </div>
        <div className="home-steps">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <div className="home-step" key={step.title}>
                <div className="home-step__icon">
                  <Icon />
                </div>
                <span className="home-step__index">Step {index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__header">
          <h2>Everything a support team actually needs</h2>
          <p>Built as a full platform, not a chatbot demo.</p>
        </div>
        <div className="home-features">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div className="home-feature-card" key={feature.title}>
                <div className="home-feature-card__icon">
                  <Icon />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      <footer className="home-footer">
        <span>&copy; {new Date().getFullYear()} Customer Support Desk</span>
        <div className="home-footer__links">
          <a href="https://github.com/ArunkumarCoder/ai-customer-support-platform" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
