import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const container = document.getElementById('root')!;
let root = createRoot(container);
let session = 0;
const render = () =>
  root.render(
    <App
      key={session}
      reset={() => {
        session++;
        render();
      }}
    />,
  );
render();
// Unmount synchronously on exit, including bfcache navigation: abort imports and terminate workers.
window.addEventListener('pagehide', () => root.unmount());
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    root = createRoot(container);
    session++;
    render();
  }
});
