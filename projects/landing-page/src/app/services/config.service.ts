import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  readonly apiBaseUrl: string = 'http://localhost:3000';

  readonly itemAnimationDelay: number = 50; // ms - ou 70ms pour + lent
  readonly returnAnimationDelay: number = 10; // ms - ping-code --> promo-list
  readonly finalAnimationDelay: number = 400; // ms
  readonly viewTransitionDelay: number = 500; // ms
  readonly maxVisibleItemsForAnimation: number = 5;
  readonly clickAnimationDuration: number = 800; // ms

  readonly dimensions = {
    containerWidth: '1280px',
    containerHeight: '413px',
    circleIconDimension: '56px',
    buttonHeight: '60px',
    standardFontSize: '36px',
  };

  readonly supportedLanguages: string[] = [
    'fr',
    'en',
    'bg',
    'de',
    'es',
    'it',
    'ja',
    'ko',
    'ru',
    'zh',
  ];
  readonly defaultLanguage: string = 'en';
  readonly defaultCurrencySymbol: string = '€';

  readonly validCodePattern: RegExp = /^\w{2}-\w{4}-\w{4}-\w{4}-\w{4}$/;

  constructor() {}

  getAPIPlayerStatusUrl(playerId: string): string {
    return `${this.apiBaseUrl}/player/${playerId}/status`;
  }

  getAPIPlayerPromosUrl(playerId: string): string {
    return `${this.apiBaseUrl}/player/${playerId}/promos`;
  }

  getAPIPromoUseUrl(promoId: number): string {
    return `${this.apiBaseUrl}/promo/${promoId}/use`;
  }

  getAPIPromoValidateUrl(): string {
    return `${this.apiBaseUrl}/promo/validate`;
  }
}
