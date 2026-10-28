import { Sparkline } from '@tulipfarm/sprout/chart';
import { Metric } from '@tulipfarm/sprout/metric';
import '../styles/metric-demo.css';

export default function MetricDemo() {
  return (
    <div className="metric-demo" data-testid="metric-demo">
      <Metric
        label="Memory used"
        value="11.2 GB"
        change={{ value: '0.4 GB', direction: 'up', tone: 'negative', label: 'vs 5 min ago' }}
        trend={<Sparkline values={[9.8, 10.1, 10.4, 10.2, 10.8, 11.2]} title="Memory used trend" area />}
        caption="Of 16 GB"
      />
      <Metric
        label="Weekly active users"
        value="2,481"
        change={{ value: '12%', direction: 'up', tone: 'positive', label: 'vs last week' }}
      />
      <Metric label="Open incidents" value="0" change={{ value: '0', direction: 'flat', label: 'since yesterday' }} />
      <Metric label="Week" value="38" caption="Thursday, 18 September 2026" />
    </div>
  );
}
