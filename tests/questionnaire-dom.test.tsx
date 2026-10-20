// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
  type QuestionnaireItemDefinition,
  type QuestionnaireProps,
} from '../packages/sprout/src/components/questionnaire.js';

const definitions: QuestionnaireItemDefinition[] = [
  {
    name: 'crop',
    required: true,
    choices: [{ value: 'tulip' }, { value: 'rose', disabled: true }, { value: 'lily' }],
  },
  { name: 'beds', choices: [{ value: 'a' }, { value: 'b' }, { value: 'c' }] },
  { name: 'skipped', disabled: true },
  { name: 'note' },
];

function Survey({
  onSubmit = event => event.preventDefault(),
  onStatusChange,
  multiple = false,
  noteInvalid = false,
  ...props
}: Partial<QuestionnaireProps> & {
  onStatusChange?: (status: string) => void;
  multiple?: boolean;
  noteInvalid?: boolean;
}) {
  return (
    <Questionnaire onSubmit={onSubmit} {...props}>
      <QuestionnaireProgress />
      <QuestionnaireItem name="crop" required onStatusChange={onStatusChange}>
        <QuestionnaireTitle>Crop?</QuestionnaireTitle>
        <QuestionnaireDescription>Pick one.</QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="tulip">Tulip</QuestionnaireChoice>
          <QuestionnaireChoice value="rose" disabled>
            Rose
          </QuestionnaireChoice>
          <QuestionnaireChoice value="lily">Lily</QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireItem name="beds" multiple={multiple}>
        <QuestionnaireTitle>Beds?</QuestionnaireTitle>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="a" defaultChecked>
            A
          </QuestionnaireChoice>
          <QuestionnaireChoice value="b">B</QuestionnaireChoice>
          <QuestionnaireChoice value="c">C</QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError>Bad beds</QuestionnaireError>
      </QuestionnaireItem>
      <QuestionnaireItem name="skipped" disabled>
        <QuestionnaireTitle>Never</QuestionnaireTitle>
      </QuestionnaireItem>
      <QuestionnaireItem name="note" invalid={noteInvalid}>
        <QuestionnaireTitle>Note?</QuestionnaireTitle>
        <QuestionnaireInput aria-label="Note" />
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireActions>
        <QuestionnairePrevious />
        <QuestionnaireSkip />
        <QuestionnaireNext />
        <QuestionnaireSubmit />
      </QuestionnaireActions>
    </Questionnaire>
  );
}

const form = () => document.querySelector('form')!;
const names = ['crop', 'beds', 'skipped', 'note'];
const item = (name: string) => document.querySelectorAll<HTMLFieldSetElement>('fieldset')[names.indexOf(name)]!;
const activeName = () =>
  names[Array.from(document.querySelectorAll('fieldset')).findIndex(f => f.hasAttribute('data-active'))];
const button = (name: string) =>
  document.querySelector<HTMLButtonElement>(`[data-slot="questionnaire-${name.toLowerCase()}"]`)!;
const choice = (value: string) => document.querySelector<HTMLInputElement>(`input[value="${value}"]`)!;

describe('Questionnaire in the DOM', () => {
  it('walks through items with the buttons, validating required ones', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const onStatusChange = vi.fn();
    render(<Survey onSubmit={onSubmit} onStatusChange={onStatusChange} />);
    expect(activeName()).toBe('crop');
    expect(screen.getByRole('progressbar').textContent).toBe('Question 1 of 3');
    expect(button('Previous').hidden).toBe(true);
    expect(button('Skip').hidden).toBe(true);

    fireEvent.click(button('Next'));
    expect(activeName()).toBe('crop');
    expect(item('crop').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Choose an answer to continue.');

    fireEvent.click(choice('tulip'));
    expect(onStatusChange).toHaveBeenCalledWith('answered');
    fireEvent.click(button('Next'));
    expect(activeName()).toBe('beds');
    expect(item('beds').dataset.status).toBe('answered');

    fireEvent.click(button('Previous'));
    expect(activeName()).toBe('crop');
    fireEvent.click(button('Next'));
    fireEvent.click(button('Skip'));
    expect(activeName()).toBe('note');
    expect(item('beds').dataset.status).toBe('skipped');
    expect(button('Submit').hidden).toBe(false);

    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'Water daily' },
    });
    expect(item('note').dataset.status).toBe('answered');
    fireEvent.click(button('Submit'));
    expect(onSubmit).toHaveBeenCalledOnce();

    // Skip on the last item submits on the next microtask.
    fireEvent.click(button('Skip'));
    await act(async () => {});
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('jumps back to the first invalid item on submit', () => {
    const onSubmit = vi.fn();
    render(<Survey onSubmit={onSubmit} defaultItem="note" />);
    expect(activeName()).toBe('note');
    fireEvent.submit(form());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(activeName()).toBe('crop');
    // Submitting again on the invalid item focuses it in place.
    fireEvent.submit(form());
    expect(document.activeElement).toBe(choice('tulip'));
  });

  it('keeps server errors visible with invalid', () => {
    render(<Survey defaultItem="note" noteInvalid />);
    expect(item('note').hasAttribute('data-invalid')).toBe(true);
    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'x' },
    });
    expect(item('note').hasAttribute('data-invalid')).toBe(true);
  });

  it('resets answers and returns to the default item', () => {
    const onReset = vi.fn();
    render(<Survey onReset={onReset} />);
    fireEvent.click(choice('lily'));
    fireEvent.click(button('Next'));
    fireEvent.click(choice('c'));
    fireEvent.reset(form());
    expect(onReset).toHaveBeenCalled();
    expect(activeName()).toBe('crop');
    expect(choice('lily').checked).toBe(false);
    expect(choice('a').checked).toBe(true);
  });

  it('lets onReset cancel the reset', () => {
    render(<Survey onReset={event => event.preventDefault()} />);
    fireEvent.click(choice('lily'));
    fireEvent.reset(form());
    expect(choice('lily').checked).toBe(true);
  });

  it('drives the items from the keyboard', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(<Survey onSubmit={onSubmit} shortcuts="letters" />);
    const crop = item('crop');
    // ArrowRight on an unanswered item does nothing.
    fireEvent.keyDown(crop, { key: 'ArrowRight' });
    expect(activeName()).toBe('crop');
    // Arrow down from the fieldset focuses and picks the first choice.
    fireEvent.keyDown(crop, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(choice('tulip'));
    expect(choice('tulip').checked).toBe(true);
    // Letter shortcut picks the second enabled choice.
    fireEvent.keyDown(crop, { key: 'b' });
    expect(choice('lily').checked).toBe(true);
    fireEvent.keyDown(crop, { key: 'b', repeat: true });
    fireEvent.keyDown(crop, { key: 'z' });
    // Enter on a checked choice advances.
    fireEvent.keyDown(choice('lily'), { key: 'Enter' });
    expect(activeName()).toBe('beds');
    // Enter on a non-answer does nothing.
    fireEvent.keyDown(item('beds'), { key: 'Enter' });
    fireEvent.keyDown(item('beds'), { key: 'ArrowLeft' });
    expect(activeName()).toBe('crop');
    fireEvent.keyDown(item('crop'), { key: 'ArrowRight' });
    expect(activeName()).toBe('beds');
    fireEvent.keyDown(item('beds'), { key: 'ArrowRight', repeat: true });
    fireEvent.keyDown(item('beds'), { key: 'Enter', metaKey: true });
    expect(activeName()).toBe('note');
    fireEvent.keyDown(item('note'), {
      key: 'Enter',
      ctrlKey: true,
      repeat: true,
    });
    // Modified keys and composition are ignored.
    fireEvent.keyDown(item('note'), { key: 'a', altKey: true });
    fireEvent.keyDown(item('note'), { key: 'a', keyCode: 229 });
    // Text entry swallows letter shortcuts.
    const note = screen.getByLabelText('Note');
    fireEvent.keyDown(note, { key: 'a' });
    // Arrow keys on an empty text input move focus between answers.
    fireEvent.keyDown(note, { key: 'ArrowUp' });
    fireEvent.change(note, { target: { value: 'done' } });
    fireEvent.keyDown(note, { key: 'ArrowUp' });
    fireEvent.keyDown(note, { key: 'Enter', ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('moves radio focus with arrows only across non-radio targets', () => {
    render(<Survey shortcuts="numbers" />);
    const tulip = choice('tulip');
    fireEvent.keyDown(item('crop'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(choice('lily'));
    // Radio to radio is left to the browser.
    fireEvent.keyDown(tulip, { key: 'ArrowDown' });
    fireEvent.keyDown(tulip, { key: 'ArrowLeft' });
    fireEvent.keyDown(item('crop'), { key: '1' });
    expect((tulip as HTMLInputElement).checked).toBe(true);
    fireEvent.keyDown(item('crop'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(tulip);
  });

  it('uses item definitions for order and shortcuts', () => {
    render(<Survey items={definitions} shortcuts="letters" defaultItem="skipped" />);
    expect(activeName()).toBe('crop');
    expect(screen.getByRole('progressbar').textContent).toBe('Question 1 of 3');
    const shortcuts = Array.from(item('crop').querySelectorAll('[data-slot="questionnaire-choice-shortcut"]')).map(
      node => node.textContent,
    );
    expect(shortcuts).toEqual(['A', 'B']);
    fireEvent.keyDown(item('crop'), { key: 'b' });
    expect(choice('lily').checked).toBe(true);
    fireEvent.reset(form());
    expect(activeName()).toBe('crop');
  });

  it('supports a controlled item', () => {
    function Controlled() {
      const [current, setCurrent] = useState('crop');
      return (
        <>
          <Survey item={current} onItemChange={setCurrent} />
          <button type="button" onClick={() => setCurrent('note')}>
            jump
          </button>
        </>
      );
    }
    render(<Controlled />);
    fireEvent.click(screen.getByText('jump'));
    expect(activeName()).toBe('note');
    expect(document.activeElement).toBe(item('note'));
    fireEvent.click(button('Previous'));
    expect(activeName()).toBe('beds');
  });

  it('recovers when the controlled item is unknown', () => {
    const onItemChange = vi.fn();
    render(<Survey item="ghost" onItemChange={onItemChange} />);
    expect(onItemChange).toHaveBeenCalledWith('crop');
  });

  it('collapses checkbox selections when multiple turns off', () => {
    const { rerender } = render(<Survey multiple defaultItem="beds" />);
    fireEvent.click(choice('b'));
    expect(item('beds').querySelectorAll('input:checked').length).toBe(2);
    fireEvent.click(choice('b'));
    fireEvent.click(choice('b'));
    rerender(<Survey defaultItem="beds" />);
    expect(item('beds').querySelectorAll('input[data-checked]').length).toBe(1);
  });

  it('handles controlled choices and inputs', () => {
    const onChange = vi.fn();
    function Controlled() {
      const [crop, setCrop] = useState<string | null>('tulip');
      const [note, setNote] = useState('');
      return (
        <Questionnaire onSubmit={event => event.preventDefault()}>
          <QuestionnaireItem name="crop">
            <QuestionnaireChoice value="tulip" checked={crop === 'tulip'} onChange={() => setCrop('tulip')}>
              Tulip
            </QuestionnaireChoice>
            <QuestionnaireChoice
              value="lily"
              checked={crop === 'lily'}
              onChange={event => {
                onChange(event);
                setCrop('lily');
              }}
            >
              Lily
            </QuestionnaireChoice>
            <QuestionnaireInput aria-label="Other" value={note} onChange={event => setNote(event.target.value)} />
          </QuestionnaireItem>
          <QuestionnaireItem name="end">
            <QuestionnaireChoice value="x" onChange={e => e.preventDefault()}>
              X
            </QuestionnaireChoice>
            <QuestionnaireInput aria-label="Cancelled" defaultValue="seed" onChange={e => e.preventDefault()} />
          </QuestionnaireItem>
          <QuestionnaireSkip />
          <QuestionnaireNext />
        </Questionnaire>
      );
    }
    render(<Controlled />);
    fireEvent.click(choice('lily'));
    expect(onChange).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Other'), {
      target: { value: 'Fern' },
    });
    expect(screen.getByLabelText('Other').getAttribute('name')).toBe('crop');
    fireEvent.click(button('Skip'));
    fireEvent.click(choice('x'));
    fireEvent.change(screen.getByLabelText('Cancelled'), {
      target: { value: '' },
    });
  });

  it('re-checks a skipped controlled choice', () => {
    function Controlled() {
      return (
        <Questionnaire>
          <QuestionnaireItem name="crop">
            <QuestionnaireChoice value="tulip" checked onChange={() => {}}>
              Tulip
            </QuestionnaireChoice>
          </QuestionnaireItem>
          <QuestionnaireItem name="two">
            <QuestionnaireChoice value="x">X</QuestionnaireChoice>
          </QuestionnaireItem>
          <QuestionnaireSkip />
          <QuestionnairePrevious />
        </Questionnaire>
      );
    }
    render(<Controlled />);
    fireEvent.click(button('Skip'));
    fireEvent.click(button('Previous'));
    const tulip = choice('tulip');
    expect(tulip.checked).toBe(false);
    fireEvent.click(tulip);
    expect(document.querySelector('fieldset')!.dataset.status).toBe('answered');
  });

  it('reports native validity failures when validation is on', () => {
    const reportValidity = vi.spyOn(HTMLInputElement.prototype, 'reportValidity');
    render(
      <Questionnaire noValidate={false} onSubmit={event => event.preventDefault()}>
        <QuestionnaireItem name="email">
          <QuestionnaireInput aria-label="Email" type="email" />
        </QuestionnaireItem>
        <QuestionnaireItem name="end">
          <QuestionnaireInput aria-label="End" />
        </QuestionnaireItem>
        <QuestionnaireNext />
      </Questionnaire>,
    );
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(button('Next'));
    expect(reportValidity).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'a@b.co' },
    });
    fireEvent.click(button('Next'));
    expect(document.activeElement).toBe(document.querySelectorAll('fieldset')[1]);
    reportValidity.mockRestore();
  });

  it('renders an empty questionnaire and forwards refs', () => {
    const ref = vi.fn();
    const itemRef = { current: null as HTMLFieldSetElement | null };
    const inputRef = vi.fn();
    render(
      <Questionnaire ref={ref}>
        <QuestionnaireProgress />
        <QuestionnaireItem name="only" ref={itemRef} aria-keyshortcuts="F1">
          <QuestionnaireInput ref={inputRef} defaultValue={['a', ' ']} />
        </QuestionnaireItem>
      </Questionnaire>,
    );
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLFormElement));
    expect(itemRef.current?.getAttribute('aria-keyshortcuts')).toContain('F1');
    expect(inputRef).toHaveBeenCalled();
  });

  it('throws outside its parents', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<QuestionnaireTitle />)).toThrow(/QuestionnaireItem/);
    expect(() => render(<QuestionnaireNext />)).toThrow(/Questionnaire/);
    vi.restoreAllMocks();
  });
});
