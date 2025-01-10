import { CarouselCard } from '@/cards/carousel-card';
import { createReactCard } from '@/lib/create-react-card';
import './index.css';
import styles from './index.css?inline';
import { ElementType } from 'react';
import { RoomCard } from '@/cards/room-card';
import { HomeAssistant } from './lib/types';

const rootEl = document.getElementById('root')!;

const createAndDisplayCard = (
  cardName: string,
  ReactComponent: ElementType,
  config?: HomeAssistant['config'],
  parentElement: HTMLElement = rootEl,
) => {
  createReactCard(cardName, ReactComponent, styles);
  const element = document.createElement(cardName);
  element.setConfig(config);
  parentElement.appendChild(element);
};

const carouselCardContainer = document.createElement('div');
rootEl.appendChild(carouselCardContainer);
carouselCardContainer.style.minHeight = '300px';
createAndDisplayCard('carousel-card', CarouselCard, {
  entities: [],
  options: {},
}, carouselCardContainer);

createAndDisplayCard('room-card', RoomCard, {
  title: 'Test',
  subtitle: 'Bla bla bla',
  temperature: 23,
});
