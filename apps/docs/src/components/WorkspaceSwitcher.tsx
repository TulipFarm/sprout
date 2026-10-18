import { useEffect, useId, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Dialog } from "@base-ui/react/dialog";
import { Buildings } from "reicon-react/icons/Buildings";
import { UserCircle } from "reicon-react/icons/UserCircle";
import { ChevronDown } from "reicon-react/icons/ChevronDown";
import { Plus } from "reicon-react/icons/Plus";
import { useSidebar } from "@tulipfarm/sprout/sidebar";
import "../styles/workspace-switcher.css";

export interface Workspace {
  id: string;
  name: string;
  plan: string;
  icon: "team" | "personal";
}

interface Props {
  workspaces: Workspace[];
  workspace: Workspace;
  side: "left" | "right";
  onSelect: (workspace: Workspace) => void;
  onCreate: (name: string) => void;
}

function WorkspaceIcon({ workspace }: { workspace: Workspace }) {
  const Icon = workspace.icon === "personal" ? UserCircle : Buildings;
  return <Icon size={18} aria-hidden="true" />;
}

export default function WorkspaceSwitcher({
  workspaces,
  workspace,
  side,
  onSelect,
  onCreate,
}: Props) {
  const { isMobile } = useSidebar();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [modifier, setModifier] = useState("Ctrl");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();
  const summaryId = useId();

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setModifier("⌘");
  }, []);

  function select(next: Workspace) {
    onSelect(next);
    setOpen(false);
  }

  return (
    <>
      <Menu.Root open={open} onOpenChange={setOpen}>
        <Menu.Trigger
          ref={triggerRef}
          className="workspace-trigger"
          aria-label="Switch workspace"
          aria-describedby={summaryId}
        >
          <span className="workspace-avatar workspace-avatar-active">
            <WorkspaceIcon workspace={workspace} />
          </span>
          <span className="workspace-summary" id={summaryId}>
            <span className="workspace-name">{workspace.name}</span>
            <span className="workspace-plan">{workspace.plan}</span>
          </span>
          <span className="workspace-caret" aria-hidden="true">
            <ChevronDown size={13} />
            <ChevronDown size={13} />
          </span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner
            className="workspace-menu-positioner"
            side={isMobile ? "bottom" : side === "left" ? "right" : "left"}
            align="start"
            sideOffset={10}
          >
            <Menu.Popup
              className="workspace-menu"
              aria-label="Workspaces"
              finalFocus={creating ? false : triggerRef}
              onKeyDown={(event) => {
                if (
                  !(event.metaKey || event.ctrlKey) ||
                  event.altKey ||
                  event.nativeEvent.isComposing
                )
                  return;
                const index = Number(event.key) - 1;
                const next = workspaces[index];
                if (!/^[1-9]$/.test(event.key) || !next) return;
                event.preventDefault();
                event.stopPropagation();
                select(next);
              }}
            >
              <Menu.Group>
                <Menu.GroupLabel className="workspace-menu-label">
                  Workspaces
                </Menu.GroupLabel>
                <Menu.RadioGroup value={workspace.id}>
                  {workspaces.map((item, index) => (
                    <Menu.RadioItem
                      key={item.id}
                      value={item.id}
                      label={item.name}
                      className="workspace-menu-item"
                      closeOnClick
                      onClick={() => select(item)}
                      aria-keyshortcuts={
                        index < 9
                          ? `Meta+${index + 1} Control+${index + 1}`
                          : undefined
                      }
                    >
                      <span className="workspace-avatar">
                        <WorkspaceIcon workspace={item} />
                      </span>
                      <span className="workspace-name">{item.name}</span>
                      {index < 9 && (
                        <kbd aria-hidden="true">
                          {modifier}
                          {index + 1}
                        </kbd>
                      )}
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Group>
              <Menu.Separator className="workspace-menu-separator" />
              <Menu.Item
                className="workspace-menu-item workspace-add"
                onClick={() => {
                  setName("");
                  setError("");
                  setCreating(true);
                }}
              >
                <span className="workspace-avatar">
                  <Plus size={18} aria-hidden="true" />
                </span>
                <span>Add workspace</span>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <Dialog.Root open={creating} onOpenChange={setCreating}>
        <Dialog.Portal>
          <Dialog.Backdrop className="workspace-create-backdrop" />
          <Dialog.Popup
            className="workspace-create-dialog"
            initialFocus={inputRef}
            finalFocus={triggerRef}
          >
            <Dialog.Title className="workspace-create-title">
              Add workspace
            </Dialog.Title>
            <Dialog.Description className="workspace-create-description">
              Create a temporary workspace for this preview. It disappears when
              you reload the page.
            </Dialog.Description>
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                const trimmed = name.trim();
                if (!trimmed) {
                  setError("Enter a workspace name.");
                  inputRef.current?.focus();
                  return;
                }
                if (
                  workspaces.some(
                    (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
                  )
                ) {
                  setError("A workspace with this name already exists.");
                  inputRef.current?.focus();
                  return;
                }
                onCreate(trimmed);
                setCreating(false);
              }}
            >
              <label htmlFor={inputId}>Workspace name</label>
              <input
                id={inputId}
                ref={inputRef}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                autoComplete="off"
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
              />
              {error && (
                <p id={errorId} className="workspace-create-error" role="alert">
                  {error}
                </p>
              )}
              <div className="workspace-create-actions">
                <Dialog.Close className="workspace-create-cancel">
                  Cancel
                </Dialog.Close>
                <button type="submit" className="workspace-create-submit">
                  Create workspace
                </button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
