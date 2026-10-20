import {
  useCallback,
  useEffect,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Loader } from 'reicon-react/icons/Loader';
import '../styles/dialog-demo.css';

export function Example({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="dialog-demo-card" aria-label={title} id={id}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="dialog-demo-card-body">{children}</div>
    </section>
  );
}

/** One row per dialog: what it is, the source pattern, and its trigger. */
export function Row({ label, note, children }: { label: string; note: string; children: ReactNode }) {
  return (
    <div className="dialog-demo-row" role="group" aria-label={label}>
      <div className="dialog-demo-row-text">
        <span className="dialog-demo-row-label">{label}</span>
        <span className="dialog-demo-row-note">{note}</span>
      </div>
      <div className="dialog-demo-row-actions">{children}</div>
    </div>
  );
}

/** Runs a callback after a delay and cancels it on unmount. */
export function useLater() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);
  return useCallback((run: () => void, ms = 900) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      run();
    }, ms);
    timers.current.add(timer);
  }, []);
}

export function TextField({
  id,
  label,
  hint,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="dialog-demo-field">
      <label htmlFor={id}>{label}</label>
      {hint && <p className="dialog-demo-muted">{hint}</p>}
      <input id={id} className="dialog-demo-input" autoComplete="off" {...input} />
    </div>
  );
}

export function TextAreaField({
  id,
  label,
  ...input
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
}) {
  return (
    <div className="dialog-demo-field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} className="dialog-demo-input dialog-demo-textarea" {...input} />
    </div>
  );
}

export function CheckField({
  id,
  checked,
  onChange,
  children,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="dialog-demo-check">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
      />
      <label htmlFor={id}>{children}</label>
    </div>
  );
}

export function Skeleton() {
  return <div className="dialog-demo-skeleton" aria-hidden="true" />;
}

export function Spinner() {
  return <Loader size={16} aria-hidden="true" className="dialog-demo-spinner" />;
}

/** Cloud's inline action row for dialogs without a footer bar. */
export function Actions({ children }: { children: ReactNode }) {
  return <div className="dialog-demo-actions">{children}</div>;
}

export function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
