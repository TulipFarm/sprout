import { useLayoutEffect, useRef, useState, type ComponentProps } from 'react';
import { cn } from '../internal/classes.js';

/** Milliseconds per character while typing. */
export const typedTextCharacterDuration = 25;

/** The longest a change takes to type, however long the text. */
export const typedTextMaxDuration = 800;

let segmenter: Intl.Segmenter | undefined;

function graphemes(text: string) {
  segmenter ??= new Intl.Segmenter('und', { granularity: 'grapheme' });
  return Array.from(segmenter.segment(text), item => item.segment);
}

export interface TypedTextProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** The full text. A change types the new text in; the first render shows it at once. */
  text: string;
  /** Set `false` to show changes at once, such as a title someone renamed by hand. */
  animate?: boolean | undefined;
}

/**
 * Text that types itself in when it changes, such as a chat title an agent
 * renamed. Screen readers get the full text at once; reduced motion skips
 * the typing.
 */
export function TypedText({ text, animate = true, className, ...rest }: TypedTextProps) {
  const previous = useRef(text);
  const [visible, setVisible] = useState(text);

  useLayoutEffect(() => {
    const changed = previous.current !== text;
    previous.current = text;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!changed || !animate || motion.matches) {
      setVisible(text);
      return;
    }
    const characters = graphemes(text);
    const start = performance.now();
    const duration = Math.min(typedTextMaxDuration, characters.length * typedTextCharacterDuration);
    let frame = 0;
    setVisible(characters[0] ?? '');
    function tick(now: number) {
      const progress = duration ? Math.min(1, (now - start) / duration) : 1;
      setVisible(characters.slice(0, Math.max(1, Math.ceil(progress * characters.length))).join(''));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    function reduceMotion() {
      if (!motion.matches) return;
      cancelAnimationFrame(frame);
      setVisible(text);
    }
    frame = requestAnimationFrame(tick);
    motion.addEventListener('change', reduceMotion);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener('change', reduceMotion);
    };
  }, [text, animate]);

  return (
    <span
      data-slot="typed-text"
      data-state={visible === text ? 'idle' : 'typing'}
      className={cn('sprout-typed-text', className)}
      {...rest}
    >
      <span className="sprout-typed-text-sr-only">{text}</span>
      <span aria-hidden="true">{visible}</span>
    </span>
  );
}
