'use client';

import { Lightbulb, LightbulbOff, Moon } from 'lucide-react';
import { type ReactCardProps } from '@/lib/create-react-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEntityStateValue, useEntityState } from '@/lib/hooks/hass-hooks';
import { useComputed } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';

interface Config {
  title: string;
  subtitle: string;
  light_entity: string;
  temperature_entity: string;
  blinds_entity: string;
}

export const RoomCard = ({ hass, config }: ReactCardProps<Config>) => {
  useSignals();

  const currentConfig = config.value;
  const lightState = useEntityState(hass, currentConfig.light_entity);
  const temperatureState = useEntityStateValue(hass, currentConfig.temperature_entity);
  const blindsState = useEntityState(hass, currentConfig.blinds_entity);

  // console.log(hass.value.entities[currentConfig.light_entity])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{currentConfig.title}</CardTitle>
        <CardDescription>{currentConfig.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <span className="text-lg">{temperatureState.value}°</span>
          </div>

          <Button size="icon-lg" aria-label="Power">
            <ha-state-icon
              hass={hass.value}
              stateObj={lightState.value}
            ></ha-state-icon>
          </Button>

          <Button size="icon-lg" aria-label="Fan">
            <ha-state-icon
              hass={hass.value}
              stateObj={blindsState.value}
            ></ha-state-icon>
          </Button>

          <Button size="icon-lg" aria-label="Night mode">
            <Moon />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
