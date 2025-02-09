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
import { useSignals } from '@preact/signals-react/runtime';
import { AspectRatio } from '@/components/ui/aspect-ratio';

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
  const temperatureState = useEntityStateValue(
    hass,
    currentConfig.temperature_entity,
  );
  const blindsState = useEntityState(hass, currentConfig.blinds_entity);

  const backgroundImage =
    'https://cdn.midjourney.com/0e101d9a-5443-4c01-8f2a-c2f4193edfc2/0_2.png';

  // console.log(hass.value.entities[currentConfig.light_entity])

  return (
    <AspectRatio ratio={1/0.5}>
      <Card
        className="bg-cover bg-center h-full"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="bg-white/70 h-full flex flex-col">
          <CardHeader>
            <CardTitle>{currentConfig.title}</CardTitle>
            <CardDescription>{currentConfig.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
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
    </AspectRatio>
  );
};
