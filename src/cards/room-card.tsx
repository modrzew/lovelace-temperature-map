import { type ReactCardProps } from '@/lib/create-react-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEntityStateValue, useEntityState } from '@/lib/hooks/hass-hooks';
import { handleAction } from '@/lib/ha/panels/lovelace/common/handle-actions';
import { useRef } from 'react';
import { HomeAssistant } from '@/lib/ha/types';
import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@/lib/utils';

interface Config {
  title: string;
  subtitle?: string;
  light_entity?: string;
  temperature_entity?: string;
  blinds_entity?: string;
}

export const RoomCard = ({ hass, config }: ReactCardProps<Config>) => {
  useSignals();
  const buttonRef = useRef<HTMLDivElement>(null);

  const currentConfig = config.value;
  const lightState = useEntityState(hass, currentConfig.light_entity);
  const temperatureState = useEntityStateValue(
    hass,
    currentConfig.temperature_entity,
  );
  const blindsState = useEntityState(hass, currentConfig.blinds_entity);

  const backgroundImage =
    'https://cdn.midjourney.com/0e101d9a-5443-4c01-8f2a-c2f4193edfc2/0_2.png';

  const handleLightAction = () => {
    handleAction(
      buttonRef.current!,
      hass.value as unknown as HomeAssistant,
      {
        entity: currentConfig.light_entity,
        tap_action: {
          action: 'toggle',
        },
        hold_action: {
          action: 'more-info',
        },
      },
      'tap',
    );
  };

  return (
    <Card
      className="bg-cover bg-center h-full overflow-hidden relative"
      style={{ backgroundImage: `url(${backgroundImage})` }}
      ref={buttonRef}
    >
      <div
        className={cn(
          'z-10 flex flex-col h-full shadow-2xl transition-all',
          lightState.value?.state === 'on'
            ? 'bg-muted/80'
            : 'bg-muted/90 backdrop-grayscale-90 backdrop-blur-xs text-muted-foreground',
        )}
      >
        <CardHeader>
          <Button
            size="icon-lg"
            aria-label="Lights"
            onClick={handleLightAction}
            variant={
              lightState.value?.state === 'on' ? 'default' : 'ghostOutline'
            }
          >
            <ha-state-icon
              hass={hass.value}
              stateObj={lightState.value}
            ></ha-state-icon>
          </Button>
          <CardTitle>{currentConfig.title}</CardTitle>
          <CardDescription>{currentConfig.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <span className="text-lg">{temperatureState.value}</span>
            </div>

            <Button size="icon-lg" aria-label="Blinds">
              <ha-state-icon
                hass={hass.value}
                stateObj={blindsState.value}
              ></ha-state-icon>
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};
