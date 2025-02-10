import { CarouselCard } from '@/cards/carousel-card';
import { RoomCard } from '@/cards/room-card';
import { createReactCard } from '@/lib/create-react-card';
import './global.css';
import styles from './index.css?inline';

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(styles);

createReactCard('carousel-card', CarouselCard, styleSheet);
createReactCard('room-card', RoomCard, styleSheet);
