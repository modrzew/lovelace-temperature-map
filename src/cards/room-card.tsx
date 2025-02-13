import { type ReactCardProps } from '@/lib/create-react-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEntityStateValue, useEntityState, useEntityAttributeValue } from '@/lib/hooks/hass-hooks';
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
  const cardRef = useRef<HTMLDivElement>(null);

  const currentConfig = config.value;
  const lightState = useEntityState(hass, currentConfig.light_entity);
  const lightColorState = useEntityAttributeValue(hass, currentConfig.light_entity, 'rgb_color');
  const temperatureState = useEntityStateValue(
    hass,
    currentConfig.temperature_entity,
  );
  const blindsState = useEntityState(hass, currentConfig.blinds_entity);

  const backgroundImage =
    'https://cdn.midjourney.com/0e101d9a-5443-4c01-8f2a-c2f4193edfc2/0_2.png';

  const handleLightAction = () => {
    handleAction(
      cardRef.current!,
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

  const handleBlindsAction = () => {
    handleAction(
      cardRef.current!,
      hass.value as unknown as HomeAssistant,
      { entity: currentConfig.blinds_entity, tap_action: { action: 'toggle' } },
      'tap',
    );
  };

  return (
    <Card
      className="bg-cover bg-center h-full overflow-hidden relative"
      style={{ backgroundImage: `url(${backgroundImage})` }}
      ref={cardRef}
    >
      <div
        className={cn(
          'z-10 flex flex-col h-full shadow-2xl transition-all',
          lightState.value?.state === 'on'
            ? 'bg-muted/80'
            : 'bg-muted/90 backdrop-grayscale-90 backdrop-blur-xs text-muted-foreground',
        )}
      >
        <CardHeader className="flex gap-3 flex-row">
          <div className="flex-auto flex flex-col space-y-3">
            <Button
              size="icon-lg"
              aria-label="Lights"
              onClick={handleLightAction}
              variant={
                lightState.value?.state === 'on' ? 'default' : 'ghostOutline'
              }
              className={cn(
                'drop-shadow-md transition-shadow',
                lightState.value?.state === 'on'
                  ? 'shadow-[0_0_48px_20px_rgba(0,0,0,0.3)] shadow-yellow-300'
                  : '',
              )}
              style={{ "--tw-shadow-color": `rgb(${lightColorState.value})` }}
            >
              <ha-state-icon
                hass={hass.value}
                stateObj={lightState.value}
              ></ha-state-icon>
            </Button>
            <CardTitle>{currentConfig.title}</CardTitle>
            <CardDescription>{currentConfig.subtitle}</CardDescription>
          </div>
          <div className="flex-none text-2xl font-medium tracking-tight">
            {temperatureState.value}
          </div>
        </CardHeader>
        <CardContent className="mt-auto">
          <div className="flex items-center gap-3">
            <Button size="icon-lg" aria-label="Blinds" onClick={handleBlindsAction}>
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
