import { BarChart3, Cable, Car, Download, Moon, ShieldCheck, Sun, Tags, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
const steps = [
  { label: 'Connect', icon: Cable },
  { label: 'Import usage', icon: Download },
  { label: 'Coverage', icon: BarChart3 },
  { label: 'EV charging', icon: Car },
  { label: 'Tariffs', icon: Tags },
  { label: 'Compare', icon: Zap },
];
type Props = {
  step: number;
  navigate: (step: number) => void;
  reset: () => void;
  theme: string;
  toggleTheme: () => void;
  children: ReactNode;
  connected: boolean;
};
export function Shell({ step, navigate, reset, theme, toggleTheme, children, connected }: Props) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Replay navigation">
        <a className="brand" href="#main">
          <span className="brand-icon">
            <Zap fill="currentColor" size={23} />
          </span>
          <span>
            energy<span className="brand-light">replay</span>
            <small>BY RUSSELL TECH</small>
          </span>
        </a>
        <p className="nav-label">YOUR COMPARISON</p>
        <nav aria-label="Replay steps">
          {steps.map((item, index) => (
            <button
              key={item.label}
              className={step === index ? 'nav-item active' : 'nav-item'}
              aria-current={step === index ? 'step' : undefined}
              onClick={() => navigate(index)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              <small>{String(index + 1).padStart(2, '0')}</small>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck size={20} />
          <strong>Private by design</strong>
          <p>
            In your browser.
            <br />
            Under your control.
          </p>
          <span className="badge">PRIVACY FIRST</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            <span className="status-dot" />
            {connected ? 'Provider connected · session only' : 'A fresh perspective on your energy'}
          </span>
          <div className="actions">
            <button
              className="icon-button"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button onClick={reset}>Clear session</button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer>
          Historical replay. No guaranteed future savings.{' '}
          <span>Built for a more informed choice.</span>
          <nav className="footer-links" aria-label="Project links">
            <a href="/docs/about.html">About</a>
            <a href="/docs/projects/energy-replay.html">Project</a>
            <a href="/docs/privacy.html">Privacy</a>
            <a href="/docs/contact.html">Contact</a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
