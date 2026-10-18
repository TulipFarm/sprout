import { useState, type ReactNode } from "react";
import { Check } from "reicon-react/icons/Check";
import { FileText } from "reicon-react/icons/FileText";
import { Upload } from "reicon-react/icons/Upload";
import { Button } from "@tulipfarm/sprout/button";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  Toaster,
  createToastManager,
  toast,
  useToastManager,
  type ToastType,
} from "@tulipfarm/sprout/toast";
import "../styles/toast-demo.css";

function Example({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="toast-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="toast-demo-card-body">{children}</div>
    </section>
  );
}

const typeSamples: {
  type: ToastType | undefined;
  label: string;
  title: string;
  description: string;
}[] = [
  {
    type: undefined,
    label: "Default",
    title: "Draft saved",
    description: "Changes are stored on this device.",
  },
  {
    type: "success",
    label: "Success",
    title: "Invite sent",
    description: "Ana Ruiz can now join the Meadow workspace.",
  },
  {
    type: "error",
    label: "Error",
    title: "Couldn’t publish",
    description: "Harvest log is locked by another editor.",
  },
  {
    type: "warning",
    label: "Warning",
    title: "Storage almost full",
    description: "9.2 of 10 GB used. Older uploads may be archived.",
  },
  {
    type: "info",
    label: "Info",
    title: "New version available",
    description: "Reload to get the latest editor.",
  },
  {
    type: "loading",
    label: "Loading",
    title: "Importing contacts",
    description: "1,240 rows from contacts.csv…",
  },
];

function OpenCount() {
  const { toasts } = useToastManager();
  const open = toasts.filter(
    (item) => item.transitionStatus !== "ending",
  ).length;
  return (
    <p className="toast-demo-caption" role="status">
      {open === 0 ? "No notifications open" : `${open} open`}
    </p>
  );
}

/** Mounts the page's shared `Toaster`, so every example on this page can call `toast.add`. */
export function ToastPlayground() {
  return (
    <Toaster>
      <section className="toast-demo-stage" aria-label="Toast playground">
        <div className="toast-demo-toolbar">
          <span className="toast-demo-caption">
            Each closes after 5 seconds
          </span>
          <OpenCount />
        </div>
        <div className="toast-demo-buttons">
          {typeSamples.map((sample) => (
            <Button
              key={sample.label}
              variant="outline"
              size="sm"
              onClick={() =>
                toast.add({
                  title: sample.title,
                  description: sample.description,
                  type: sample.type,
                  timeout: 5000,
                })
              }
            >
              {sample.label}
            </Button>
          ))}
        </div>
      </section>
    </Toaster>
  );
}

export function ToastWithAction() {
  return (
    <Example
      title="With action"
      description="An Undo button in the toast. Choosing it shows a title-only follow-up."
    >
      <div className="toast-demo-row">
        <Button
          variant="outline"
          onClick={() => {
            const id = toast.add({
              title: "Sample saved",
              description: "Changes exist only in this example.",
              actionProps: {
                children: "Undo",
                onClick: () => {
                  toast.close(id);
                  toast.add({ title: "Sample undone", type: "info" });
                },
              },
            });
          }}
        >
          <Check />
          Save sample
        </Button>
      </div>
    </Example>
  );
}

function IsolatedControls() {
  const manager = useToastManager();
  return (
    <div className="toast-demo-row">
      {(["success", "error", "warning", "info", "loading"] as const).map(
        (type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() =>
              manager.add({
                title: `${type[0]!.toUpperCase()}${type.slice(1)} example`,
                description: "A local notification. No action was sent.",
                type,
                timeout: 5000,
              })
            }
          >
            {type}
          </Button>
        ),
      )}
    </div>
  );
}

export function ToastIsolated() {
  const [manager] = useState(createToastManager);
  return (
    <Example
      title="Isolated manager"
      description="A Toaster with its own manager. Buttons inside it call useToastManager().add."
    >
      <Toaster toastManager={manager}>
        <IsolatedControls />
      </Toaster>
    </Example>
  );
}

function fakeUpload(fail: boolean) {
  return new Promise<string>((resolve, reject) =>
    setTimeout(
      () =>
        fail ? reject(new Error("Connection lost")) : resolve("report-q3.pdf"),
      1500,
    ),
  );
}

export function ToastPromise() {
  return (
    <Example
      title="Loading, then a result"
      description="toast.promise shows a loading toast and swaps it for success or error when the work settles."
    >
      <div className="toast-demo-row">
        {[false, true].map((fail) => (
          <Button
            key={String(fail)}
            variant={fail ? "outline" : "default"}
            onClick={() =>
              toast
                .promise(fakeUpload(fail), {
                  loading: {
                    title: "Uploading report-q3.pdf",
                    description: "2.4 MB",
                  },
                  success: (name) => ({
                    title: "Upload complete",
                    description: `${name} is ready to share.`,
                  }),
                  error: (error: Error) => ({
                    title: "Upload failed",
                    description: `${error.message}. Try again when you’re back online.`,
                  }),
                })
                .catch(() => {})
            }
          >
            <Upload />
            {fail ? "Upload that fails" : "Upload file"}
          </Button>
        ))}
      </div>
    </Example>
  );
}

const queueSeed = [
  {
    title: "garden-plan.pdf",
    description: "Uploaded · 1.1 MB",
    type: "success",
  },
  {
    title: "harvest-photos.zip",
    description: "Failed · file is over 50 MB",
    type: "error",
  },
  {
    title: "seed-catalog.csv",
    description: "Uploaded · 84 KB",
    type: "success",
  },
];

function QueueList() {
  const { toasts } = useToastManager();
  return toasts.map((item) => (
    <Toast key={item.id} toast={item} swipeDirection={["right", "down"]}>
      <ToastContent>
        <span className="toast-demo-file" aria-hidden="true">
          <FileText />
        </span>
        <div className="toast-demo-text">
          <ToastTitle />
          <ToastDescription />
        </div>
        {item.type === "error" ? <ToastAction>Retry</ToastAction> : null}
        <ToastClose />
      </ToastContent>
    </Toast>
  ));
}

function QueueEmpty({ onRestore }: { onRestore: () => void }) {
  const { toasts } = useToastManager();
  if (toasts.length > 0) return null;
  return (
    <div className="toast-demo-empty">
      <p>Upload queue is empty</p>
      <Button variant="outline" size="sm" onClick={onRestore}>
        <Upload />
        Add uploads
      </Button>
    </div>
  );
}

export function ToastCustomList() {
  const [manager] = useState(createToastManager);
  const seed = () => {
    for (const item of queueSeed) {
      const failedId = manager.add({
        ...item,
        timeout: 0,
        actionProps:
          item.type === "error"
            ? {
                onClick: () => {
                  manager.close(failedId);
                  const id = manager.add({
                    title: "harvest-photos.zip",
                    description: "Retrying with a smaller batch…",
                    type: "loading",
                    timeout: 0,
                  });
                  setTimeout(
                    () =>
                      manager.update(id, {
                        description: "Uploaded · 48 MB",
                        type: "success",
                      }),
                    1200,
                  );
                },
              }
            : undefined,
      });
    }
  };
  return (
    <Example
      title="Custom layout"
      description="Toast parts composed by hand in a framed viewport: a file icon, Retry only on failures, and swipe right or down to dismiss. These stay until closed."
    >
      <ToastProvider toastManager={manager}>
        <div className="toast-demo-frame" data-testid="toast-queue-frame">
          <QueueEmpty onRestore={seed} />
          <ToastViewport
            aria-label="Upload queue"
            className="toast-demo-frame-viewport"
          >
            <QueueList />
          </ToastViewport>
        </div>
      </ToastProvider>
    </Example>
  );
}
