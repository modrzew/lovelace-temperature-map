import { CarouselCard } from '@/cards/carousel-card';
import { createReactCard } from '@/lib/create-react-card';
import styles from './index.css?inline';
import './preview.css';
import { ElementType } from 'react';
import { RoomCard } from '@/cards/room-card';
import { HomeAssistant } from './lib/types';
import { hass } from './mocks/hass';
import { DoorOpenCard } from './cards/door-open-card';
import { TemperatureMapCard } from './cards/temperature-map-card';

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(styles);

const rootEl = document.getElementById('root')!;

const createAndDisplayCard = (
  cardName: string,
  ReactComponent: ElementType,
  config?: HomeAssistant['config'],
  parentElement: HTMLElement = rootEl,
) => {
  createReactCard(cardName, ReactComponent, styleSheet);
  const element = document.createElement(cardName);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (element as any).setConfig(config);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (element as any).hass = hass;
  parentElement.appendChild(element);
};

const carouselCardContainer = document.createElement('div');
rootEl.appendChild(carouselCardContainer);
carouselCardContainer.style.minHeight = '300px';
createAndDisplayCard('carousel-card', CarouselCard, {
  entities: [],
  options: {},
} as any, carouselCardContainer);

createAndDisplayCard('room-card', RoomCard, {
  title: 'Living room',
  subtitle: '',
  temperature: 23,
  light_entity: 'light.fake_light_1',
  temperature_entity: 'sensor.fake_temperature_1',
} as any);

createAndDisplayCard('door-open-card', DoorOpenCard, {
  entity: 'sensor.fake_door_open_1',
} as any);

createAndDisplayCard('temperature-map-card', TemperatureMapCard, {
  title: 'Apartment Temperature Map (Physics-Based)',
  width: 400,
  height: 300,
  min_temp: 18,
  max_temp: 28,
  too_cold_temp: 20,
  too_warm_temp: 26,
  ambient_temp: 22,
  walls: [
    { x1: 50, y1: 50, x2: 350, y2: 50 },   // Top wall
    { x1: 350, y1: 50, x2: 350, y2: 250 }, // Right wall  
    { x1: 350, y1: 250, x2: 50, y2: 250 }, // Bottom wall
    { x1: 50, y1: 250, x2: 50, y2: 50 },   // Left wall
    { x1: 200, y1: 50, x2: 200, y2: 150 }, // Interior wall dividing left/right
    { x1: 50, y1: 175, x2: 200, y2: 175 }, // Interior wall dividing top/bottom left
  ],
  sensors: [
    { entity: 'sensor.fake_temperature_1', x: 125, y: 100, label: 'Living Room' },
    { entity: 'sensor.fake_temperature_2', x: 275, y: 125, label: 'Kitchen' },
    { entity: 'sensor.fake_temperature_3', x: 125, y: 215, label: 'Bedroom' },
    { entity: 'sensor.fake_temperature_4', x: 275, y: 215, label: 'Bathroom' },
  ],
} as any);
