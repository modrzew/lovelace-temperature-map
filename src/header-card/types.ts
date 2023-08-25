import { type LovelaceCard, type LovelaceCardConfig, type LovelaceCardEditor } from 'custom-card-helpers';

declare global {
  interface HTMLElementTagNameMap {
    'header-card-editor': LovelaceCardEditor;
    'hui-error-card': LovelaceCard;
  }
}

export type HeaderCardConfig = LovelaceCardConfig;
