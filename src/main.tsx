import { CarouselCard } from '@/cards/carousel-card';
import { createReactCard } from '@/lib/create-react-card';
import './index.css';
import styles from './index.css?inline';
import { ElementType } from 'react';

const rootEl = document.getElementById('root')!;

const createAndDisplayCard = (
  cardName: string,
  ReactComponent: ElementType,
) => {
  createReactCard(cardName, ReactComponent, styles);
  rootEl.appendChild(document.createElement(cardName));
};

createAndDisplayCard('carousel-card', CarouselCard);
