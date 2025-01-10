'use client';

import { Blinds, Lightbulb, LightbulbOff, Moon } from 'lucide-react';
import { type ReactCardProps } from '@/lib/create-react-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Config {
  title?: string;
  subtitle?: string;
  temperature?: number;
  light_entity?: string;
  temperature_entity?: string;
}

export const RoomCard = ({ hass, config }: ReactCardProps<Config>) => {
  const currentConfig = config.value;
  const currentHass = hass.value;

  const lightEntity = currentHass.states[currentConfig.light_entity];
  console.log(lightEntity)
  const temperatureEntity = currentHass.states[currentConfig.temperature_entity];
  console.log(temperatureEntity)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{currentConfig.title}</CardTitle>
        <CardDescription>
          {currentConfig.subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <span className="text-lg">
              {temperatureEntity.state}°
            </span>
          </div>

          <Button size="icon-lg" aria-label="Power">
            {lightEntity.state === 'off' ? <LightbulbOff /> : <Lightbulb />}
          </Button>

          <Button size="icon-lg" aria-label="Fan">
            <Blinds />
          </Button>

          <Button size="icon-lg" aria-label="Night mode">
            <Moon />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
