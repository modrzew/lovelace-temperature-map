import { CarouselCard } from '@/cards/carousel-card';
import { RoomCard } from '@/cards/room-card';
import { DoorOpenCard } from '@/cards/door-open-card';
import { TransportNSWCard } from '@/cards/transportnsw-card';
import { HeaderCard } from '@/cards/header-card';
import { TemperatureMapCard } from '@/cards/temperature-map-card';
import { createReactCard } from '@/lib/create-react-card';
import globalStyles from './global.css?inline';
import styles from './index.css?inline';

const globalStyleEl = document.createElement('style');
globalStyleEl.textContent = globalStyles;
document.head.appendChild(globalStyleEl);

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(styles);

document.body.style.position = 'relative';

createReactCard('carousel-card', CarouselCard, styleSheet);
createReactCard('room-card', RoomCard, styleSheet);
createReactCard('door-open-card', DoorOpenCard, styleSheet);
createReactCard('header-card', HeaderCard, styleSheet);
createReactCard('transportnsw-card', TransportNSWCard, styleSheet);
createReactCard('temperature-map-card', TemperatureMapCard, styleSheet);
