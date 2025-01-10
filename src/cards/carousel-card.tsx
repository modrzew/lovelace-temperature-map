import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { ReactCardProps } from '@/lib/create-react-card';
import { useEffect, useState } from 'react';

export type CarouselCardProps = ReactCardProps<{
  entities: any[];
  options: any;
}>;

const loadCardHelpers = (window as any).loadCardHelpers
  ? (window as any).loadCardHelpers()
  : undefined;

export const CarouselCard = ({ config, hass }: CarouselCardProps) => {
  const [element, setElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const fn = async () => {
      const element = (await loadCardHelpers).createCardElement(
        config.value.entities[0],
      );
      element.hass = hass.value;
      setElement(element);
      element.addEventListener(
        'll-rebuild',
        (ev: Event) => {
          ev.stopPropagation();
          fn();
        },
        {
          once: true,
        },
      );
    };
    fn();
  }, [config, hass]);

  return (
    <Carousel className="mx-16" opts={config.value.options}>
      <CarouselContent>
        <CarouselItem>
          {element && (
            <div
              className="p-1"
              ref={(r) => {
                r?.appendChild(element);
              }}
            />
          )}
        </CarouselItem>
      </CarouselContent>
      <CarouselNext />
      <CarouselPrevious />
    </Carousel>
  );
};
