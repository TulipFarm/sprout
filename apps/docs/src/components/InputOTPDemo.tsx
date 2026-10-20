import { useState, type ReactNode } from 'react';
import { Button } from '@tulipfarm/sprout/button';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@tulipfarm/sprout/input-otp';
import { Label } from '@tulipfarm/sprout/label';
import '../styles/input-otp-demo.css';

function Example({
  title,
  description,
  children,
  testId,
}: {
  title: string;
  description: string;
  children: ReactNode;
  testId: string;
}) {
  return (
    <section className="input-otp-demo-card" aria-label={title} data-testid={testId}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="input-otp-demo-card-body">{children}</div>
    </section>
  );
}

function Slots({ start, invalid = false }: { start: number; invalid?: boolean }) {
  return [0, 1, 2].map(offset => (
    <InputOTPSlot key={offset} index={start + offset} aria-invalid={invalid || undefined} />
  ));
}

function SixDigits({ invalid }: { invalid?: boolean }) {
  return (
    <>
      <InputOTPGroup>
        <Slots start={0} invalid={invalid} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <Slots start={3} invalid={invalid} />
      </InputOTPGroup>
    </>
  );
}

function InProgress() {
  const [code, setCode] = useState('12');
  return (
    <div className="input-otp-demo-state" data-testid="state-progress">
      <p className="input-otp-demo-label">In progress</p>
      <InputOTP maxLength={6} defaultValue="12" aria-label="Verification code" onChange={setCode}>
        <SixDigits />
      </InputOTP>
      <p role="status" className="input-otp-demo-helper">
        {code.length === 6 ? 'All 6 digits entered. Nothing was verified.' : `${code.length} of 6 digits entered.`}
      </p>
    </div>
  );
}

function Incorrect() {
  const [code, setCode] = useState('194278');
  const [showError, setShowError] = useState(true);
  return (
    <div className="input-otp-demo-state" data-testid="state-error">
      <p className="input-otp-demo-label">Incorrect code</p>
      <InputOTP
        maxLength={6}
        value={code}
        onChange={value => {
          setCode(value);
          setShowError(false);
        }}
        aria-label="Incorrect verification code"
        aria-invalid={showError}
        aria-describedby="input-otp-demo-error"
      >
        <SixDigits invalid={showError} />
      </InputOTP>
      <p
        id="input-otp-demo-error"
        role={showError ? 'alert' : 'status'}
        className={showError ? 'input-otp-demo-error' : 'input-otp-demo-helper'}
      >
        {showError ? 'That code didn’t match. Try again.' : 'Code changed locally; no verification request was sent.'}
      </p>
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCode('');
            setShowError(false);
          }}
        >
          Try another code
        </Button>
      </div>
    </div>
  );
}

function Disabled() {
  return (
    <div className="input-otp-demo-state" data-testid="state-disabled">
      <p className="input-otp-demo-label">Disabled</p>
      <InputOTP maxLength={6} disabled defaultValue="123456" aria-label="Disabled code">
        <SixDigits />
      </InputOTP>
    </div>
  );
}

function Labelled() {
  const [code, setCode] = useState('');
  return (
    <div className="input-otp-demo-state" data-testid="labelled">
      <Label htmlFor="input-otp-demo-signin">Sign-in code</Label>
      <InputOTP
        id="input-otp-demo-signin"
        maxLength={6}
        value={code}
        onChange={setCode}
        aria-describedby="input-otp-demo-signin-help"
      >
        <SixDigits />
      </InputOTP>
      <p id="input-otp-demo-signin-help" className="input-otp-demo-helper">
        Enter the 6-digit code from your authenticator app. Paste fills every slot.
      </p>
    </div>
  );
}

export default function InputOTPDemo() {
  return (
    <div id="input-otp-demo" className="input-otp-demo">
      <Example
        title="Six-digit codes"
        description="Type or focus an example. Codes stay local and are never verified or sent."
        testId="six-digit"
      >
        <div className="input-otp-demo-states">
          <InProgress />
          <Incorrect />
          <Disabled />
        </div>
      </Example>
      <Example
        title="With a label"
        description="A native label names the code; a helper is read when the group is entered."
        testId="with-label"
      >
        <Labelled />
      </Example>
    </div>
  );
}
