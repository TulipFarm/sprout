"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { ShieldUser } from "reicon-react/icons/ShieldUser";
import { cn } from "../internal/classes.js";
import { Button } from "./button.js";
import {
  ReviewCard,
  ReviewRow,
  ReviewRows,
  type ReviewCardBadge,
} from "./review-card.js";
import { Spinner } from "./spinner.js";

export const chatConfirmationStateNames = [
  "pending",
  "submitting",
  "approved",
  "rejected",
  "expired",
  "cancelled",
  "error",
] as const;

export type ChatConfirmationDecision = "approve" | "reject";

export type ConfirmationState =
  | { kind: "pending" }
  | { kind: "submitting"; decision: ChatConfirmationDecision }
  | { kind: "approved" }
  | { kind: "rejected" }
  | { kind: "expired" }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

export type ChatConfirmationDetail = { label: string; value: string };

export interface ChatConfirmationProps extends Omit<
  ComponentProps<"div">,
  "title" | "children"
> {
  /** What the agent wants to do, such as “Remove the Notes field”. */
  title: string;
  /** One line above the facts, such as “Review these changes before approving.” */
  description: string;
  /** Labeled facts about the action, in order. */
  details: readonly ChatConfirmationDetail[];
  state: ConfirmationState;
  onDecision: (decision: ChatConfirmationDecision) => void;
  /** Locks both buttons, such as while the request is refreshing or cannot be verified. */
  disabled?: boolean | undefined;
}

const settledKinds = new Set<ConfirmationState["kind"]>([
  "approved",
  "rejected",
  "expired",
  "cancelled",
]);

const badges: Record<ConfirmationState["kind"], ReviewCardBadge> = {
  pending: { label: "Approval required", variant: "warning" },
  submitting: { label: "Approval required", variant: "warning" },
  error: { label: "Approval required", variant: "warning" },
  approved: { label: "Approved", variant: "info" },
  rejected: { label: "Declined", variant: "secondary" },
  expired: { label: "Expired", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

const outcomes: Partial<Record<ConfirmationState["kind"], string>> = {
  approved:
    "Approval recorded. This does not confirm the action has completed.",
  rejected: "The proposed action was declined.",
  expired: "This approval expired. No approval was granted.",
  cancelled: "This approval was cancelled. No approval was granted.",
};

/**
 * Asks someone in chat to approve or decline an action an agent proposed.
 * Built on `ReviewCard`: it folds once decided, and when the decision was
 * made from inside the card, focus moves to the outcome.
 */
export function ChatConfirmation({
  title,
  description,
  details,
  state,
  onDecision,
  disabled = false,
  className,
  ...props
}: ChatConfirmationProps) {
  const done = settledKinds.has(state.kind);
  const section = useRef<HTMLDivElement>(null);
  const result = useRef<HTMLParagraphElement>(null);
  const submittedHere = useRef(false);
  useEffect(() => {
    if (state.kind === "submitting")
      submittedHere.current =
        section.current?.contains(document.activeElement) ?? false;
    if (done && submittedHere.current) {
      result.current?.focus();
      submittedHere.current = false;
    }
  }, [done, state.kind]);
  const submitting = state.kind === "submitting";
  const busy = (decision: ChatConfirmationDecision) =>
    state.kind === "submitting" && state.decision === decision;
  const outcome = outcomes[state.kind];
  return (
    <div
      ref={section}
      data-slot="chat-confirmation"
      data-state={state.kind}
      {...props}
      className={cn("sprout-chat-confirmation", className)}
    >
      <ReviewCard
        icon={<ShieldUser size={16} />}
        title={title}
        badge={badges[state.kind]}
        settled={done}
        status={
          state.kind === "error" || outcome ? (
            <>
              {state.kind === "error" && (
                <p role="alert" className="sprout-chat-confirmation-error">
                  {state.message}
                </p>
              )}
              {outcome && (
                <p
                  ref={result}
                  tabIndex={-1}
                  role="status"
                  className="sprout-chat-confirmation-result"
                >
                  {outcome}
                </p>
              )}
            </>
          ) : undefined
        }
        actions={
          done ? undefined : (
            <>
              <Button
                disabled={disabled || submitting}
                aria-busy={busy("approve")}
                onClick={() => onDecision("approve")}
              >
                {busy("approve") && <Spinner aria-hidden="true" />}
                Approve action
              </Button>
              <Button
                variant="ghost"
                disabled={disabled || submitting}
                aria-busy={busy("reject")}
                onClick={() => onDecision("reject")}
              >
                {busy("reject") && <Spinner aria-hidden="true" />}
                Decline
              </Button>
            </>
          )
        }
      >
        <p className="sprout-chat-confirmation-description">{description}</p>
        <ReviewRows>
          {details.map((detail) => (
            <ReviewRow key={detail.label} label={detail.label}>
              {detail.value}
            </ReviewRow>
          ))}
        </ReviewRows>
      </ReviewCard>
    </div>
  );
}
