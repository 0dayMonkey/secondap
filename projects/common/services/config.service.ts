import { Injectable } from '@angular/core';
import { AppConfigService } from '../../landing-page/src/app/services/app-config.service';
import { AppConfig } from '../../landing-page/src/app/models/app-config.model';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  constructor(private appConfigService: AppConfigService) {}

  private get c(): AppConfig {
    return this.appConfigService.config;
  }

  get apiBaseUrl(): string {
    return this.c.api.baseUrl;
  }

  get itemAnimationDelay(): number {
    return this.c.animations.itemDelay;
  }

  get returnAnimationDelay(): number {
    return this.c.animations.returnItemDelay;
  }

  get finalAnimationDelay(): number {
    return this.c.animations.cascadeEndDelay;
  }

  get viewTransitionDelay(): number {
    return this.c.animations.viewTransitionDuration;
  }

  get maxVisibleItemsForAnimation(): number {
    return this.c.animations.maxVisibleItemsForCascade;
  }

  get clickAnimationDuration(): number {
    return this.c.animations.clickFeedbackDuration;
  }

  get supportedLanguages(): string[] {
    return this.c.localization.supportedLanguages;
  }

  get defaultLanguage(): string {
    return this.c.localization.defaultLanguage;
  }

  get defaultCurrencySymbol(): string {
    return this.c.localization.defaultCurrencySymbol;
  }

  get validCodePattern(): RegExp {
    return new RegExp(this.c.validation.promoCode.pattern);
  }

  getAPIPlayerStatusUrl(playerId: string): string {
    const endpoint = this.c.api.endpoints.playerStatus;
    return `${this.apiBaseUrl}${endpoint.replace('{playerId}', playerId)}`;
  }

  getAPIPlayerPromosUrl(playerId: string): string {
    const endpoint = this.c.api.endpoints.playerPromos;
    return `${this.apiBaseUrl}${endpoint.replace('{playerId}', playerId)}`;
  }

  getAPIPromoUseUrl(promoId: number): string {
    const endpoint = this.c.api.endpoints.usePromo;
    return `${this.apiBaseUrl}${endpoint.replace(
      '{promoId}',
      String(promoId)
    )}`;
  }

  getAPIPromoValidateUrl(): string {
    return `${this.apiBaseUrl}${this.c.api.endpoints.validatePromo}`;
  }
}
