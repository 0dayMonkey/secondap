import { Component, OnInit, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import {
  PromoService,
  Promotion,
  PlayerStatus,
} from '../../services/promo.service';
import { catchError, of } from 'rxjs';
import { MboxData } from '../../models/models';
import { FormattingService } from '../../services/formatting.service';
import { AnimationService } from '../../services/animation.service';
import { MboxInfoService } from '../../services/mbox-info.service';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-promo-list',
  templateUrl: './promo-list.component.html',
  styleUrls: ['./promo-list.component.scss'],
})
export class PromoListComponent implements OnInit {
  promotions: Promotion[] = [];
  isCustomer = false;
  isLoading = true;
  error: string | null = null;

  showPinCode = false;
  readyForPinCode = false;
  isExitingPinCode = false;

  @Input() mboxData!: MboxData;

  constructor(
    private promoService: PromoService,
    private translate: TranslateService,
    private formatService: FormattingService,
    private animationService: AnimationService,
    private mboxInfoService: MboxInfoService,
    private config: ConfigService
  ) {}

  ngOnInit(): void {
    if (this.mboxData) {
      this.mboxInfoService.setMboxData(this.mboxData);
    }
    this.loadPlayerData();
  }

  loadPlayerData(): void {
    this.isLoading = true;
    this.error = null;
    this.promotions = [];

    this.promoService
      .checkPlayerStatus()
      .pipe(
        catchError((err) => {
          this.isLoading = false;
          return of({ isCustomer: false, message: '' });
        })
      )
      .subscribe((status: PlayerStatus) => {
        this.isCustomer = status.isCustomer;

        if (this.isCustomer) {
          this.loadPromotions();
        } else {
          this.isLoading = false;
        }
      });
  }

  loadPromotions(): void {
    this.promoService
      .getPlayerPromos()
      .pipe(
        catchError((err) => {
          this.isLoading = false;
          return of({ data: [], message: '' });
        })
      )
      .subscribe((response) => {
        this.promotions = response.data;
        this.isLoading = false;
      });
  }

  formatReward(promo: Promotion): string {
    return this.formatService.formatReward(promo);
  }

  getPromoIconClass(promoType: string): string {
    return this.formatService.getPromoIconClass(promoType);
  }

  selectPromo(promo: Promotion, element: HTMLElement): void {
    console.log('Promotion sélectionnée:', promo);
    this.animationService.applyClickAnimation(element);
  }

  animateItem(index: number): boolean {
    return this.animationService.animateItem(index);
  }

  showEnterCodeScreen(): void {
    this.startCodeEntryAnimation();
  }

  startCodeEntryAnimation(): void {
    this.animationService
      .startCascadeAnimation(this.promotions.length)
      .then((visibleItemCount) => {
        const animationDelay =
          (visibleItemCount - 1) * this.config.itemAnimationDelay;

        setTimeout(() => {
          this.readyForPinCode = true;
          setTimeout(() => {
            this.showPinCode = true;
          }, this.config.finalAnimationDelay / 8);
        }, animationDelay);
      });
  }

  prepareReturnAnimation(): void {
    this.isExitingPinCode = true;
    this.readyForPinCode = false;
    this.startReverseAnimation();
  }

  hideEnterCodeScreen(): void {
    this.showPinCode = false;
    this.isExitingPinCode = false;
  }
  startReverseAnimation(): void {
    this.animationService.resetAnimation();
    this.animationService.startReverseCascadeAnimation(this.promotions.length);
  }

  validateEnteredCode(code: string): void {
    console.log('Code validé:', code);
  }
}
