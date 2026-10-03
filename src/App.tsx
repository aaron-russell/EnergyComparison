import { lazy, Suspense, useEffect, useState } from 'react';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { Shell } from './components/Shell';
import { SeoMetadata } from './components/SeoMetadata';
import { ConnectionPage } from './pages/Connection';
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
  useEffect(() => {
    document.documentElement.dataset.appReady = 'true';
  }, []);
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
      <SeoMetadata step={step as 0 | 1 | 2 | 3 | 4 | 5} />
      <Shell
        step={step}
        navigate={navigate}
        reset={reset}
        theme={theme}
        toggleTheme={toggleTheme}
        connected={!!session.connection}
      >
        <Suspense fallback={<LoadingSkeleton />}>
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
