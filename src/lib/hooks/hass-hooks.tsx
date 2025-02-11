import { HomeAssistant } from '@/lib/types';
import { Signal, useComputed } from '@preact/signals-react';

export const useEntityState = (
  hass: Signal<HomeAssistant>,
  entityId: string,
) => {
  return useComputed(() => hass.value.states[entityId]);
};

export const useEntityStateValue = (
  hass: Signal<HomeAssistant>,
  entityId: string,
) => {
  return useComputed(() =>
    hass.value.formatEntityState(hass.value.states[entityId]),
  );
};

export const useEntityAttributeValue = (
  hass: Signal<HomeAssistant>,
  entityId: string,
  attribute: string,
) => {
  return useComputed(() =>
    hass.value.formatEntityAttributeValue(
      hass.value.states[entityId],
      attribute,
    ),
  );
};
