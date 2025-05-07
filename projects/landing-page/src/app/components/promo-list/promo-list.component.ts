import { Component, OnInit, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TranslationService } from '../../services/translation.service';
import { PromoService } from '../../services/promo.service';
import { catchError, of } from 'rxjs';
import {
  MboxData,
  Promotion,
  PlayerStatus,
} from '../../../../../common/models/common.models';
import { FormattingService } from '../../services/formatting.service';
import { AnimationService } from '../../services/animation.service';
import { MboxInfoService } from '../../../../../common/services/mbox-info.service';
import { ConfigService } from 'projects/common/services/config.service';
import {
  ValidationResult,
  PromoValidationService,
} from '../../services/promo-validation.service';
import { ActivatedRoute } from '@angular/router';

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
  isReturnFromPinCode = false;

  showConfirmation = false;
  confirmationData: ValidationResult = {
    isSuccess: true,
    isMember: true,
  };

  @Input() mboxData!: MboxData;

  constructor(
    private promoService: PromoService,
    private translate: TranslateService,
    private translationService: TranslationService,
    private formatService: FormattingService,
    private animationService: AnimationService,
    private mboxInfoService: MboxInfoService,
    private config: ConfigService,
    private promoValidationService: PromoValidationService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (this.mboxData) {
      this.mboxInfoService.setMboxData(this.mboxData);
    }
    this.loadPlayerData();

    // Traitement des paramètres d'URL après redirection
    this.route.queryParams.subscribe((params) => {
      if (params['status']) {
        this.handlePinAuthResult(params);
      }
    });
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

  getUtilisationInfo(promo: Promotion): string {
    if (!promo.utilisation) {
      return '';
    }

    const { restantes, maximum } = promo.utilisation;

    if (maximum === 1) {
      return '';
    }

    return this.translate.instant('PromoList.utilisationInfo', {
      restantes,
      maximum,
    });
  }

  getPromoIconClass(promoType: string): string {
    return this.formatService.getPromoIconClass(promoType);
  }

  selectPromo(promo: Promotion, element: HTMLElement): void {
    this.animationService.applyClickAnimation(element);

    // Demande d'authentification du joueur avec requestPlayerPin
    const currentUrl = window.location.href.split('?')[0];
    const baseUrl = currentUrl.endsWith('/') ? currentUrl : `${currentUrl}/`;

    this.promoValidationService.requestPlayerAuthentication({
      promoId: promo.id,
      urlOnSuccess: `${baseUrl}?status=success&promoId=${promo.id}`,
      urlOnFailure: `${baseUrl}?status=failure&promoId=${promo.id}`,
      urlOnError: `${baseUrl}?status=error&promoId=${promo.id}`,
      customPayload: {
        promoType: promo.promo_type,
        rewardType: promo.reward_type,
        rewardValue: promo.reward_value,
      },
    });
  }

  // Traiter les résultats de l'authentification par PIN
  handlePinAuthResult(params: any): void {
    const status = params['status'];
    const promoId = parseInt(params['promoId'], 10);

    if (status === 'success' && promoId) {
      // Authentification réussie, applique la promotion
      this.promoValidationService.applyValidatedPromo(promoId).subscribe({
        next: (result) => {
          if (result.isSuccess) {
            this.showConfirmationScreen({
              isSuccess: true,
              isMember: true,
              promoId: promoId,
              rewardType: params['rewardType'] || 'Point',
              rewardValue: parseInt(params['rewardValue'], 10) || 0,
            });
            this.loadPromotions();
          } else {
            this.showConfirmationScreen({
              isSuccess: false,
              isMember: true,
              errorMessage: result.errorMessage,
            });
          }
        },
        error: (error) => {
          this.showConfirmationScreen({
            isSuccess: false,
            isMember: true,
            errorMessage:
              error.message || "Erreur lors de l'application de la promotion",
          });
        },
      });
    } else if (status === 'failure') {
      // Échec de l'authentification
      this.showConfirmationScreen({
        isSuccess: false,
        isMember: true,
        errorMessage:
          'PIN invalide, impossible de vous identifier. Réessayez ultérieurement.',
      });
    } else if (status === 'error') {
      // Erreur pendant l'authentification
      this.showConfirmationScreen({
        isSuccess: false,
        isMember: true,
        errorMessage:
          "Erreur lors de l'authentification, réessayez ultérieurement.",
      });
    }
  }

  animateItem(index: number): boolean {
    return this.animationService.animateItem(index);
  }

  showEnterCodeScreen(): void {
    if (!this.showPinCode && !this.isExitingPinCode) {
      this.startCodeEntryAnimation();
    }
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
          }, 50);
        }, animationDelay);
      });
  }

  prepareReturnAnimation(): void {
    if (!this.isExitingPinCode) {
      this.isExitingPinCode = true;
      this.readyForPinCode = false;
      this.startReverseAnimation();
      this.isReturnFromPinCode = true;
    }
  }

  hideEnterCodeScreen(): void {
    this.readyForPinCode = false;

    setTimeout(() => {
      this.showPinCode = false;
      this.isExitingPinCode = false;

      setTimeout(() => {
        this.isReturnFromPinCode = false;
      }, 1000);
    }, this.config.viewTransitionDelay);
  }

  startReverseAnimation(): void {
    this.animationService.resetAnimation();
    this.animationService.startReverseCascadeAnimation(this.promotions.length);
  }

  validateEnteredCode(code: string): void {}

  showConfirmationScreen(data: ValidationResult): void {
    this.confirmationData = data;
    this.showConfirmation = true;

    if (data.isSuccess) {
      this.loadPromotions();
    }
  }

  hideConfirmationScreen(): void {
    this.showConfirmation = false;
  }

  backToPinCodeFromConfirmation(): void {
    this.showConfirmation = false;
  }
}
