import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReactCardProps } from '@/lib/create-react-card';
import {
  useEntityAttributeValue,
  useEntityState,
} from '@/lib/hooks/hass-hooks';
import { HomeAssistant } from '@/lib/types';
import { Signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { parse } from 'date-fns';

type TransportNSWCardProps = ReactCardProps<{
  title: string;
  entities: string[];
}>;

const trainLineColors: { [k: string]: string } = {
  T1: '#F99D1C',
  T2: '#0098CD',
  T3: '#F37021',
  T4: '#005AA3',
  T5: '#C4258F',
  T7: '#6F818E',
  T8: '#00954C',
  T9: '#D11F2F',
  M1: '#108489',
};

const busColor = '#02ade8';

const timeFormatter = new Intl.DateTimeFormat('en-AU', {
  hour: '2-digit',
  minute: '2-digit',
});

export const TransportNSWCard = ({ hass, config }: TransportNSWCardProps) => {
  useSignals();
  const currentConfig = config.value;
  const title = currentConfig.title;
  return (
    <Card>
      {title && (
        <CardHeader className="pt-4 pb-0">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="px-2 py-2">
        {currentConfig.entities.map((entity) => (
          <TransportInfo key={entity} hass={hass} entity={entity} />
        ))}
      </CardContent>
    </Card>
  );
};

const TransportInfo = ({
  hass,
  entity,
}: {
  hass: Signal<HomeAssistant>;
  entity: string;
}) => {
  const state = useEntityState(hass, entity);
  const due = state.value ? state.value.state : 'unavailable';
  const departureTime = useEntityAttributeValue(
    hass,
    entity,
    'departure_time_estimated',
  );
  const arrivalTime = useEntityAttributeValue(
    hass,
    entity,
    'arrival_time_estimated',
  );

  const lineName = useEntityAttributeValue(
    hass,
    entity,
    'origin_line_name_short',
  );

  const transportName = useEntityAttributeValue(
    hass,
    entity,
    'origin_transport_name',
  );

  const departureTimeFormatted = timeFormatter.format(
    parse(departureTime.value, 'HH:mm:ss', new Date()),
  );
  const arrivalTimeFormatted = timeFormatter.format(
    parse(arrivalTime.value, 'HH:mm:ss', new Date()),
  );

  const color =
    transportName.value === 'BUS' ? busColor : trainLineColors[lineName.value];

  return (
    <div className="@container flex items-center space-x-4 px-3 py-2">
      <div
        className="inline-block px-3 py-2 text-bold text-white rounded-sm"
        style={{ backgroundColor: color }}
      >
        {lineName.value}
      </div>
      <div className="@md:hidden">
        <div className="text-lg">
          <em>{departureTimeFormatted}</em>
        </div>
        <div className="text-sm">Arrive by {arrivalTimeFormatted}</div>
      </div>
      <div className="ml-auto text-right">
        <div className="text-2xl font-bold">{due}</div>
        <div className="text-sm">{due === '1' ? 'min' : 'mins'}</div>
      </div>
    </div>
  );
};
