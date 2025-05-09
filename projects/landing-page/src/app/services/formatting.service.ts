import { Injectable } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Promotion } from '../../../../common/models/common.models';
import { MboxInfoService } from '../../../../common/services/mbox-info.service';
import { AppConfigService } from './app-config.service';

@Injectable()
export class FormattingService {
  constructor(
    private translate: TranslateService,
    private currencyPipe: CurrencyPipe,
    private mboxService: MboxInfoService,
    private appConfigService: AppConfigService
  ) {}

  formatReward(promo: Promotion): string {
    const configLoc = this.appConfigService.config.localization;
    const configApiMap = this.appConfigService.config.apiMapping.promo;

    if (promo.reward_type === configApiMap.rewardTypePoint) {
      return this.translate.instant('PromoList.bonusPoints', {
        value: promo.reward_value,
      });
    } else {
      const currentLang =
        this.translate.currentLang || configLoc.defaultLanguage;
      const data = this.mboxService.mboxDataObject;

      const locale =
        configLoc.localeMap[currentLang] || configLoc.defaultLanguage;
      const currencySymbol =
        data?.casinoCurrencySymbol || configLoc.defaultCurrencySymbol;

      try {
        const formattedAmount = this.currencyPipe.transform(
          promo.reward_value,
          currencySymbol,
          'symbol',
          '1.0-0',
          locale
        );

        return this.translate.instant('PromoList.cashReward', {
          value: formattedAmount,
        });
      } catch (error) {
        console.warn('Error formatting currency, using fallback', error);
        return this.translate.instant('PromoList.cashReward', {
          value: `${promo.reward_value} ${currencySymbol}`,
        });
      }
    }
  }

  getUtilisationInfo(promo: Promotion): string {
    if (
      !promo.utilisation ||
      !this.appConfigService.config.features.showPromoUtilisationInfo
    ) {
      return '';
    }

    const { restantes, maximum } = promo.utilisation;

    if (
      maximum === 1 &&
      this.appConfigService.config.promo.hideUsageInfoIfMaxOne
    ) {
      return '';
    }

    return this.translate.instant('PromoList.utilisationInfo', {
      restantes,
      maximum,
    });
  }
}
