import { TemperatureMapCard } from '@/cards/temperature-map-card';
import { createReactCard } from '@/lib/create-react-card';
import '@/temperature-map-config-editor';
import globalStyles from './global.css?inline';
import styles from './index.css?inline';

const globalStyleEl = document.createElement('style');
globalStyleEl.textContent = globalStyles;
document.head.appendChild(globalStyleEl);

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(styles);

document.body.style.position = 'relative';

createReactCard('temperature-map-card', TemperatureMapCard, styleSheet);