import { useState } from 'react';
import { Shell } from './components/Shell';
import { ConnectionPage } from './pages/Connection';
import { ImportPage } from './pages/Import';
import { CoveragePage } from './pages/Coverage';
import { ChargingPage } from './pages/Charging';
import { TariffsPage } from './pages/Tariffs';
import { ComparePage } from './pages/Compare';
import { useSession } from './state/use-session';

function initialTheme() {
  try {
    return localStorage.getItem('energy-replay:theme') ?? 'dark';
  } catch {
    return 'dark';
  }
}
export default function App({ reset }: { reset: () => void }) {
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState(initialTheme);
  const session = useSession();
  const navigate = (next: number) => {
    setStep(next);
    document.getElementById('main')?.focus();
  };
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('energy-replay:theme', next);
    } catch {
      /* Theme remains usable without storage. */
    }
  };
  const props = {
    data: session.data,
    update: session.update,
    next: () => navigate(Math.min(step + 1, 5)),
  };
  return (
    <div data-theme={theme}>
      <Shell
        step={step}
        navigate={navigate}
        reset={reset}
        theme={theme}
        toggleTheme={toggleTheme}
        connected={!!session.connection}
      >
        {step === 0 && (
          <ConnectionPage
            connection={session.connection}
            connected={session.connected}
            next={props.next}
          />
        )}
        {step === 1 && <ImportPage {...props} connection={session.connection} />}
        {step === 2 && <CoveragePage {...props} />}
        {step === 3 && <ChargingPage {...props} />}
        {step === 4 && <TariffsPage {...props} />}
        {step === 5 && <ComparePage {...props} />}
      </Shell>
    </div>
  );
}
