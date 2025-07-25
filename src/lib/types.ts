/* eslint-disable @typescript-eslint/no-explicit-any */
// To sync with https://github.com/home-assistant/frontend/blob/dev/src/types.ts
// To sync with https://github.com/home-assistant/frontend/blob/dev/src/data/lovelace_custom_cards.ts

import type {
  Auth,
  Connection,
  HassConfig,
  HassEntities,
  HassEntity,
  HassServices,
  MessageBase,
} from 'home-assistant-js-websocket';

export interface HomeAssistant {
  // auth: Auth & { external?: ExternalMessaging };
  auth: Auth;
  connection: Connection;
  connected: boolean;
  states: HassEntities;
  entities: { [id: string]: EntityRegistryDisplayEntry };
  // devices: { [id: string]: DeviceRegistryEntry };
  // areas: { [id: string]: AreaRegistryEntry };
  // floors: { [id: string]: FloorRegistryEntry };
  services: HassServices;
  config: HassConfig;
  // themes: Themes;
  // selectedTheme: ThemeSettings | null;
  // panels: Panels;
  panelUrl: string;
  // i18n
  // current effective language in that order:
  //   - backend saved user selected language
  //   - language in local app storage
  //   - browser language
  //   - english (en)
  language: string;
  // local stored language, keep that name for backward compatibility
  selectedLanguage: string | null;
  // locale: FrontendLocaleData;
  // resources: Resources;
  // localize: LocalizeFunc;
  // translationMetadata: TranslationMetadata;
  suspendWhenHidden: boolean;
  enableShortcuts: boolean;
  vibrate: boolean;
  debugConnection: boolean;
  dockedSidebar: 'docked' | 'always_hidden' | 'auto';
  defaultPanel: string;
  moreInfoEntityId: string | null;
  // user?: CurrentUser;
  // userData?: CoreFrontendUserData | null;
  hassUrl(path?: string): string;
  // callService(
  //   domain: ServiceCallRequest['domain'],
  //   service: ServiceCallRequest['service'],
  //   serviceData?: ServiceCallRequest['serviceData'],
  //   target?: ServiceCallRequest['target'],
  //   notifyOnError?: boolean,
  //   returnResponse?: boolean,
  // ): Promise<ServiceCallResponse>;
  callApi<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    parameters?: Record<string, any>,
    headers?: Record<string, string>,
  ): Promise<T>;
  callApiRaw( // introduced in 2024.11
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    parameters?: Record<string, any>,
    headers?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<Response>;
  fetchWithAuth(path: string, init?: Record<string, any>): Promise<Response>;
  sendWS(msg: MessageBase): void;
  callWS<T>(msg: MessageBase): Promise<T>;
  // loadBackendTranslation(
  //   category: Parameters<typeof getHassTranslations>[2],
  //   integrations?: Parameters<typeof getHassTranslations>[3],
  //   configFlow?: Parameters<typeof getHassTranslations>[4],
  // ): Promise<LocalizeFunc>;
  // loadFragmentTranslation(fragment: string): Promise<LocalizeFunc | undefined>;
  formatEntityState(stateObj: HassEntity, state?: string): string;
  formatEntityAttributeValue(
    stateObj: HassEntity,
    attribute: string,
    value?: any,
  ): string;
  formatEntityAttributeName(stateObj: HassEntity, attribute: string): string;
}

export interface EntityRegistryDisplayEntry {
  entity_id: string;
  name?: string;
  icon?: string;
  device_id?: string;
  area_id?: string;
  labels: string[];
  hidden?: boolean;
  translation_key?: string;
  platform?: string;
  display_precision?: number;
}


