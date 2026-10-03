import { lazy, Suspense, useEffect, useState } from 'react';
import { Shell } from './components/Shell';
import { SeoMetadata } from './components/SeoMetadata';
const ConnectionPage = lazy(() =>
  import('./pages/Connection').then((module) => ({ default: module.ConnectionPage })),
);
const ImportPage = lazy(() =>
  import('./pages/Import').then((module) => ({ default: module.ImportPage })),
);
const CoveragePage = lazy(() =>
  import('./pages/Coverage').then((module) => ({ default: module.CoveragePage })),
);
const ChargingPage = lazy(() =>
  import('./pages/Charging').then((module) => ({ default: module.ChargingPage })),
);
const TariffsPage = lazy(() =>
  import('./pages/Tariffs').then((module) => ({ default: module.TariffsPage })),
);
const ComparePage = lazy(() =>
  import('./pages/Compare').then((module) => ({ default: module.ComparePage })),
);
import { useSession } from './state/use-session';
import {
  clearSessionSnapshot,
  loadSessionSnapshot,
  saveSessionSnapshot,
} from './state/session-storage';

function initialTheme() {
  try {
    return localStorage.getItem('energy-replay:theme') ?? 'dark';
  } catch {
    return 'dark';
  }
}
export default function App({ reset }: { reset: () => void }) {
  const [step, setStep] = useState(() => loadSessionSnapshot()?.step ?? 0);
  const [theme, setTheme] = useState(initialTheme);
  const session = useSession();
  useEffect(() => {
    const hasProgress =
      step > 0 ||
      session.data.supplies.length > 0 ||
      session.data.readings.length > 0 ||
      session.data.charging.length > 0 ||
      session.data.estimated !== null ||
      session.data.baselineId !== '' ||
      session.data.isDemo ||
      session.ui.tariffs.draft !== null ||
      session.ui.coverage.bills.length > 0;
    if (!hasProgress) {
      return;
    }
    saveSessionSnapshot({ version: 1, step, data: session.data, ui: session.ui });
  }, [step, session.data, session.ui]);
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
  const clearSession = () => {
    clearSessionSnapshot();
    reset();
  };
  const props = {
    data: session.data,
    update: session.update,
    next: () => navigate(Math.min(step + 1, 5)),
    ui: session.ui,
    updateUi: session.updateUi,
  };
  return (
    <div data-theme={theme}>
      <SeoMetadata step={step as 0 | 1 | 2 | 3 | 4 | 5} />
      <Shell
        step={step}
        navigate={navigate}
        reset={clearSession}
        theme={theme}
        toggleTheme={toggleTheme}
        connected={!!session.connection}
      >
        <Suspense fallback={<p role="status">Opening replay step…</p>}>
          {step === 0 && (
            <ConnectionPage
              connection={session.connection}
              connected={session.connected}
              loadDemo={() => {
                session.loadDemo();
                navigate(5);
              }}
              next={props.next}
            />
          )}
          {step === 1 && <ImportPage {...props} connection={session.connection} />}
          {step === 2 && <CoveragePage {...props} />}
          {step === 3 && <ChargingPage {...props} />}
          {step === 4 && <TariffsPage {...props} />}
          {step === 5 && <ComparePage {...props} />}
        </Suspense>
      </Shell>
    </div>
  );
}
