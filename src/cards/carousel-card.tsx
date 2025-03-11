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

const loadCardHelpers = window.loadCardHelpers
  ? window.loadCardHelpers()
  : undefined;

export const CarouselCard = ({ config, hass }: CarouselCardProps) => {
  const [elements, setElements] = useState<HTMLElement[]>([]);

  useEffect(() => {
    const fn = async () => {
      const els: HTMLElement[] = [];
      for (const entity of config.value.entities) {
        const element = (await loadCardHelpers)?.createCardElement(entity);
        if (element) {
          // @ts-expect-error element.hass does exist, just wrongly typed
          element.hass = hass.value;
          els.push(element);
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
        }
      }
      setElements(els);
    };
    fn();
  }, [config, hass]);

  return (
    <Carousel opts={config.value.options} className="overflow-hidden h-full flex flex-col">
      <CarouselContent>
        {elements.map((element) => (
          <CarouselItem key={element.id}>
            <div
              className="p-1 h-full"
              ref={(r) => {
                r?.appendChild(element);
              }}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="mt-1 space-x-2 flex">
        <CarouselPrevious className="static translate-none flex-auto h-[24px] [&_svg]:size-5 rounded-md" />
        <CarouselNext className="static translate-none flex-auto h-[24px] [&_svg]:size-5 rounded-md" />
      </div>
    </Carousel>
  );
};
