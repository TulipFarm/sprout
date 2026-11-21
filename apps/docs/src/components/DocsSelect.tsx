import { Select } from '@base-ui/react/select';
import { CheckIcon, ChevronDownIcon } from '@tulipfarm/sprout/icons';
import '../styles/docs-select.css';

interface DocsSelectProps<Value extends string> {
  label: string;
  value: Value;
  items: readonly { value: Value; label: string }[];
  onValueChange: (value: Value) => void;
  className?: string;
}

export default function DocsSelect<Value extends string>({
  label,
  value,
  items,
  onValueChange,
  className = '',
}: DocsSelectProps<Value>) {
  return (
    <Select.Root<Value>
      items={items}
      value={value}
      onValueChange={next => {
        if (next !== null) onValueChange(next);
      }}
    >
      <Select.Trigger aria-label={label} className={`docs-select-trigger ${className}`}>
        <Select.Value className="docs-select-value" />
        <Select.Icon className="docs-select-chevron">
          <ChevronDownIcon size="sm" aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="docs-select-positioner" sideOffset={6} align="start" alignItemWithTrigger={false}>
          <Select.Popup className="docs-select-popup">
            <Select.List className="docs-select-list" aria-label={label}>
              {items.map(item => (
                <Select.Item key={item.value} value={item.value} className="docs-select-item">
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator className="docs-select-indicator">
                    <CheckIcon size="sm" aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
