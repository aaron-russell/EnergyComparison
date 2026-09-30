import type { ReactNode } from 'react';
import { ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{children}</p>
    </header>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <div className="notice error" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
export function NextButton({
  onClick,
  disabled,
  children = 'Continue',
}: {
  onClick: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <button className="primary" onClick={onClick} disabled={disabled}>
      {children}
      <ArrowRight size={17} />
    </button>
  );
}
export function PrivacyNote() {
  return (
    <div className="privacy-note">
      <ShieldCheck size={19} />
      <p>
        Your energy data stays in this browser session. Only tariffs you choose to save and your
        theme preference are stored.
      </p>
    </div>
  );
}
export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
export function OperationStatus({
  busy,
  message,
  cancel,
}: {
  busy: boolean;
  message: string;
  cancel: () => void;
}) {
  return (
    <div className="operation">
      <span role="status" aria-live="polite">
        {message}
      </span>
      {busy && <button onClick={cancel}>Cancel</button>}
    </div>
  );
}
