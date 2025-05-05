import { Injectable } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Promotion } from '../../../../common/models/common.models';
import { MboxInfoService } from '../../../../common/services/mbox-info.service';
import { ConfigService } from 'projects/common/services/config.service';

@Injectable()
export class FormattingService {
  constructor(
    private translate: TranslateService,
    private currencyPipe: CurrencyPipe,
    private mboxService: MboxInfoService,
    private config: ConfigService
  ) {}

  formatReward(promo: Promotion): string {
    if (promo.reward_type === 'credits') {
      return this.translate.instant('PromoList.bonusPoints', {
        value: promo.reward_value,
      });
    } else {
      const currentLang =
        this.translate.currentLang || this.config.defaultLanguage;
      const data = this.mboxService.mboxDataObject;
      const localeMap: { [key: string]: string } = {};
      this.config.supportedLanguages.forEach((lang) => {
        localeMap[lang] = lang;
      });

      const locale = localeMap[currentLang] || this.config.defaultLanguage;
      const currencySymbol =
        data?.casinoCurrencySymbol || this.config.defaultCurrencySymbol;

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

  getPromoIconClass(promoType: string): string {
    switch (promoType) {
      case 'birthday':
        return 'birthday-icon';
      case 'cashback':
        return 'cashback-icon';
      case 'bonus':
        return 'bonus-icon';
      case 'gift':
        return 'gift-icon';
      default:
        return 'default-icon';
    }
  }
}
