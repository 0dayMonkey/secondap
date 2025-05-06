import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  // readonly apiBaseUrl: string = 'https://recette-api.joa.fr/v1';
  readonly apiBaseUrl: string = 'https://localhost:3000/';

  // ms
  readonly itemAnimationDelay: number = 50;
  readonly returnAnimationDelay: number = 10;
  readonly finalAnimationDelay: number = 400;
  readonly viewTransitionDelay: number = 350;
  readonly maxVisibleItemsForAnimation: number = 5;
  readonly clickAnimationDuration: number = 700;

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

  getAPIPlayerStatusUrl(playerId: string): string {
    // todo : verification du joueur

    return `${this.apiBaseUrl}/player/${playerId}/status`;
  }

  getAPIPlayerPromosUrl(playerId: string): string {
    return `${this.apiBaseUrl}/crm/selligent/personne/${playerId}/stim`;
  }

  getAPIPromoUseUrl(promoId: number): string {
    return `${this.apiBaseUrl}/stim/${promoId}/use`;
  }

  getAPIPromoValidateUrl(): string {
    return `${this.apiBaseUrl}/stim/validate`;
  }
}
