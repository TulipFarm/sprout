import type { ComponentProps } from 'react';
import { Check } from 'reicon-react/icons/Check';
import { Clock } from 'reicon-react/icons/Clock';
import { Warning } from 'reicon-react/icons/Warning';
import { cn } from '../internal/classes.js';
import { Spinner } from './spinner.js';

export const chatPlanStepStateNames = ['pending', 'running', 'complete', 'error'] as const;

export type ChatPlanStepState = (typeof chatPlanStepStateNames)[number];

export type ChatPlanStep = {
  id: string;
  title: string;
  /** One line under the title, such as why a step failed. */
  detail?: string | undefined;
  state: ChatPlanStepState;
};

export interface ChatPlanProps extends Omit<ComponentProps<'section'>, 'title' | 'children'> {
  /** The plan name. It names the section and shows above the steps. */
  title: string;
  /** Steps in order. With none, the plan says no steps were proposed yet. */
  steps: readonly ChatPlanStep[];
}

const stateLabels: Record<ChatPlanStepState, string> = {
  pending: 'Not started',
  running: 'In progress',
  complete: 'Complete',
  error: 'Failed',
};

function StepIcon({ state }: { state: ChatPlanStepState }) {
  if (state === 'running') return <Spinner aria-hidden="true" />;
  if (state === 'complete') return <Check size={16} aria-hidden="true" />;
  if (state === 'error') return <Warning size={16} aria-hidden="true" />;
  return <Clock size={16} aria-hidden="true" />;
}

/**
 * A plan an agent proposed in chat, with each step’s progress: not started,
 * in progress, complete, or failed. The header counts completed steps.
 */
export function ChatPlan({ title, steps, className, ...props }: ChatPlanProps) {
  const complete = steps.filter(step => step.state === 'complete').length;
  return (
    <section data-slot="chat-plan" aria-label={title} {...props} className={cn('sprout-chat-plan', className)}>
      <div className="sprout-chat-plan-header">
        <h4 className="sprout-chat-plan-title">{title}</h4>
        <span className="sprout-chat-plan-count">
          {complete} of {steps.length} complete
        </span>
      </div>
      {steps.length === 0 ? (
        <p className="sprout-chat-plan-empty">No steps have been proposed yet.</p>
      ) : (
        <ol className="sprout-chat-plan-steps">
          {steps.map(step => (
            <li key={step.id} data-slot="chat-plan-step" data-state={step.state} className="sprout-chat-plan-step">
              <span key={step.state} className="sprout-chat-plan-icon">
                <StepIcon state={step.state} />
              </span>
              <div className="sprout-chat-plan-text">
                <p className="sprout-chat-plan-step-title">
                  {step.title}
                  <span className="sprout-chat-plan-sr-only">
                    {' · '}
                    {stateLabels[step.state]}
                  </span>
                </p>
                {step.detail && <p className="sprout-chat-plan-detail">{step.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
