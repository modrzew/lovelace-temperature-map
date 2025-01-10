'use client';

import { Fan, Moon, Power } from 'lucide-react';
import { type ReactCardProps } from '@/lib/create-react-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Config {
  title?: string;
  subtitle?: string;
  temperature?: number;
}

export const RoomCard = ({ config }: ReactCardProps<Config>) => {
  const currentConfig = config.value;

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
          <Button size="icon" aria-label="Temperature">
            <div className="flex items-center">
              <span className="text-lg">
                {currentConfig.temperature}°
              </span>
            </div>
          </Button>

          <Button size="icon" aria-label="Power">
            <Power />
          </Button>

          <Button size="icon" aria-label="Fan">
            <Fan />
          </Button>

          <Button size="icon" aria-label="Night mode">
            <Moon />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
