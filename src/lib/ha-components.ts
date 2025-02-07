import { HassEntity } from 'home-assistant-js-websocket';
import { HomeAssistant } from './types';
import type { DOMAttributes } from 'react';

type CustomElement<T> = Partial<T & DOMAttributes<T>>;

declare module 'react/jsx-runtime' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace JSX {
    interface IntrinsicElements {
      'ha-state-icon': CustomElement<{
        hass: HomeAssistant;
        stateObj: HassEntity;
      }>;
    }
  }
}
