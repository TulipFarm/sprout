import { useCallback, useState, type Ref } from 'react';

/**
 * Base UI roots are spans, which `<fieldset disabled>` does not disable. Track the
 * enclosing fieldsets so the control can pass a real `disabled` to Base UI.
 */
export function useFieldsetDisabled<T extends Element>(ref: Ref<T> | undefined) {
  const [disabled, setDisabled] = useState(false);
  const mergedRef = useCallback(
    (node: T | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      if (!node) return;
      const fieldsets: Element[] = [];
      for (
        let fieldset = node.closest('fieldset');
        fieldset;
        fieldset = fieldset.parentElement?.closest('fieldset') ?? null
      ) {
        fieldsets.push(fieldset);
      }
      if (fieldsets.length === 0) return;
      const sync = () => setDisabled(node.closest('fieldset:disabled') !== null);
      sync();
      const observer = new MutationObserver(sync);
      for (const fieldset of fieldsets)
        observer.observe(fieldset, {
          attributes: true,
          attributeFilter: ['disabled'],
        });
      return () => {
        observer.disconnect();
        if (typeof ref === 'function') ref(null);
        else if (ref) ref.current = null;
      };
    },
    [ref],
  );
  return [disabled, mergedRef] as const;
}
