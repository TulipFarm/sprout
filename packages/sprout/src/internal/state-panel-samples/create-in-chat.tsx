import { ChatIcon } from '../../components/icons.js';
import { SampleTable, SampleWindow } from '../../components/state-sample.js';
import { muted, strong, type StatePanelSampleProps } from './shared.js';

export function CreateInChatSample(props: StatePanelSampleProps) {
  return (
    <SampleWindow {...props} icon={ChatIcon} trail={['New chat']}>
      <div className="sprout-state-panel-samples-chat">
        <p className="sprout-state-panel-samples-bubble">
          Track our suppliers with a name, contact email, payment terms, and region.
        </p>
        <p className="sprout-state-panel-samples-reply">
          I’ll create a <strong>Suppliers</strong> table with these fields. Review the schema before approving.
        </p>
        <div className="sprout-state-panel-samples-schema">
          <SampleTable
            columns={[{ label: 'Field', size: 'lg' }, { label: 'Type' }]}
            rows={[
              [strong('Name'), muted('Text')],
              [strong('Contact email'), muted('Email')],
              [strong('Payment terms'), muted('Choice')],
              [strong('Region'), muted('Choice')],
            ]}
          />
        </div>
      </div>
    </SampleWindow>
  );
}
