/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, type TemplateResult, css, type CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { type HomeAssistant, getLovelace } from 'custom-card-helpers';
import type { HeaderCardConfig } from './types';
import { CARD_VERSION } from './const';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';

dayjs.extend(advancedFormat);

/* eslint no-console: 0 */
console.info(
  `%c  HEADER-CARD \n%c  Version ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'header-card',
  name: 'Header Card',
  description: 'Dashboard header card',
});

@customElement('header-card')
export class HeaderCard extends LitElement {
  _timerInterval?: number = undefined;
  // TODO: Redo this
  // public static async getConfigElement(): Promise<LovelaceCardEditor> {
  //   await import('./editor');
  //   return document.createElement('boilerplate-card-editor');
  // }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private config!: HeaderCardConfig;

  // https://lit.dev/docs/components/properties/#accessors-custom
  public setConfig(config: HeaderCardConfig): void {
    // TODO Check for required fields and that they are of the proper format
    if (!config) {
      throw new Error('Invalid configuration');
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      ...config,
    };
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._timerInterval = setInterval(() => this.requestUpdate(), 1000) as unknown as number;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._timerInterval && clearInterval(this._timerInterval);
  }

  // // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  // protected shouldUpdate(changedProps: PropertyValues): boolean {
  //   if (!this.config) {
  //     return false;
  //   }

  //   return hasConfigOrEntityChanged(this, changedProps, false) || ;
  // }

  // https://lit.dev/docs/components/rendering/
  protected render(): TemplateResult | void {
    // TODO Check for stateObj or other necessary things and render a warning if missing
    if (this.config.show_warning) {
      return this._showWarning('Show warning');
    }

    if (this.config.show_error) {
      return this._showError('Show error');
    }

    if (!this.hass) {
      return;
    }

    const date = new Date();

    return html`
      <div class="content">
        <h1 class="time">${dayjs(date).format('HH:mm:ss')}</h1>
        <div class="date">${dayjs(date).format('ddd, Do MMM')}</div>
      </div>
    `;
  }

  private _showWarning(warning: string): TemplateResult {
    return html` <hui-warning>${warning}</hui-warning> `;
  }

  private _showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card');
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this.config,
    });

    return html` ${errorCard} `;
  }

  // https://lit.dev/docs/components/styles/
  static get styles(): CSSResultGroup {
    return css`
      .content {
        padding: 0 16px;
      }

      .time {
        margin: 0;
        font-size: var(--paper-font-display3_-_font-size);
        font-weight: var(--paper-font-display3_-_font-weight);
        line-height: var(--paper-font-display3_-_line-height);
        letter-spacing: var(--paper-font-display3_-_letter-spacing);
        font-feature-settings: 'ss01';
        color: #e1e1e1;
      }

      .date {
        font-size: var(--paper-font-title_-_font-size);
        font-weight: var(--paper-font-title_-_font-weight);
        line-height: var(--paper-font-title_-_line-height);
        letter-spacing: var(--paper-font-title_-_letter-spacing);
        color: #e1e1e1;
      }
    `;
  }
}
