/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, type TemplateResult, css, type CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { hasAction, type ActionHandlerEvent, handleAction, getLovelace } from 'custom-card-helpers';
import type { HomeAssistant } from 'custom-card-helpers';
import type { TransportNswCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION, lineColors } from './const';
import dayjs from 'dayjs';

/* eslint no-console: 0 */
console.info(
  `%c  TRANSPORTNSW-CARD \n%c  Version ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'transportnsw-card',
  name: 'TransportNSW Card',
  description: 'Show TransportNSW travel details',
});

@customElement('transportnsw-card')
export class TransportNswCard extends LitElement {
  // TODO: Redo this
  // public static async getConfigElement(): Promise<LovelaceCardEditor> {
  //   await import('./editor');
  //   return document.createElement('boilerplate-card-editor');
  // }

  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private config!: TransportNswCardConfig;

  // https://lit.dev/docs/components/properties/#accessors-custom
  public setConfig(config: TransportNswCardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    if (!config.entity) {
      throw new Error('You need to define an entity');
    }

    this.config = config;
  }

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

    // const name =
    //   this.hass.states[this.config.entities[0].entity]?.attributes
    //     .friendly_name;
    const state = this.hass.states[this.config.entity];
    const stateStr = state ? state.state : 'unavailable';
    const departureTime = state.attributes.departure_time;
    const arrivalTime = state.attributes.arrival_time;
    const due = stateStr;
    const lineName = state.attributes.origin_line_name_short;

    return html`
      <ha-card
        class="content"
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this.config.hold_action),
          hasDoubleClick: hasAction(this.config.double_tap_action),
        })}
      >
        <div class="entry">
          <div class="line-container">
            <div class="line" style="background-color: ${lineColors[lineName]};">${lineName}</div>
          </div>
          <div class="time">
            <div><em>${dayjs(departureTime).format('HH:mm')}</em></div>
            <div>${dayjs(arrivalTime).format('HH:mm')} arrival</div>
          </div>
          <div class="due">
            <div class="due-number">${due}</div>
            <div class="mins">${due === '1' ? 'min' : 'mins'}</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
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
        padding: 8px 0;
      }
      .entry {
        display: flex;
        align-items: center;
        padding: 0 24px;
        margin: 0 -8px;
      }
      .line-container {
        padding-right: 16px;
      }
      .line {
        display: inline-block;
        padding: 4px 8px;
        font-weight: bold;
        color: white;
        border-radius: 8px;
      }
      .due {
        margin-left: auto;
        padding: 0 8px;
        text-align: right;
      }
      .due-number {
        font-size: 28px;
        font-weight: bold;
      }
      .mins {
        margin-top: 2px;
      }
    `;
  }
}
