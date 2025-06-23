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
  show_sensor_names: true,
  show_sensor_temperatures: true,
  walls: [
    { x1: 0, y1: 0, x2: 400, y2: 0 },     // Top wall
    { x1: 400, y1: 0, x2: 400, y2: 300 }, // Right wall  
    { x1: 400, y1: 300, x2: 0, y2: 300 }, // Bottom wall
    { x1: 0, y1: 300, x2: 0, y2: 0 },     // Left wall
    { x1: 200, y1: 0, x2: 200, y2: 150 }, // Interior wall dividing left/right
    { x1: 0, y1: 175, x2: 200, y2: 175 }, // Interior wall dividing top/bottom left
  ],
  sensors: [
    { entity: 'sensor.fake_temperature_1', x: 100, y: 75, label: 'Living Room' },
    { entity: 'sensor.fake_temperature_2', x: 300, y: 75, label: 'Kitchen' },
    { entity: 'sensor.fake_temperature_3', x: 100, y: 225, label: 'Bedroom' },
    { entity: 'sensor.fake_temperature_4', x: 300, y: 225, label: 'Bathroom' },
  ],
} as any);
