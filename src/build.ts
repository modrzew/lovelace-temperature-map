import { CarouselCard } from '@/cards/carousel-card';
import { RoomCard } from '@/cards/room-card';
import { DoorOpenCard } from '@/cards/door-open-card';
import { createReactCard } from '@/lib/create-react-card';
import './global.css';
import styles from './index.css?inline';

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(styles);

document.body.style.position = 'relative';

createReactCard('carousel-card', CarouselCard, styleSheet);
createReactCard('room-card', RoomCard, styleSheet);
createReactCard('door-open-card', DoorOpenCard, styleSheet);
