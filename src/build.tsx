import { CarouselCard } from '@/cards/carousel-card';
import { RoomCard } from '@/cards/room-card';
import { createReactCard } from '@/lib/create-react-card';
import styles from './index.css?inline';

createReactCard('carousel-card', CarouselCard, styles);
createReactCard('room-card', RoomCard, styles);
