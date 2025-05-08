import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TranslationService } from '../../services/translation.service';
import { PromoService } from '../../services/promo.service';
import { catchError, Observable, of } from 'rxjs';
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
import { PinCodeComponent } from '../pin-code/pin-code.component';
import { ErrorHandlingService } from '../../services/error-handler.service';

@Component({
  selector: 'app-promo-list',
  templateUrl: './promo-list.component.html',
  styleUrls: ['./promo-list.component.scss'],
})
export class PromoListComponent implements OnInit {
  translationsLoaded$: Observable<boolean>;
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
  @ViewChild(PinCodeComponent) pinCodeComponent!: PinCodeComponent;

  constructor(
    public translationService: TranslationService,
    private promoService: PromoService,
    private translate: TranslateService,
    private formatService: FormattingService,
    private animationService: AnimationService,
    private mboxInfoService: MboxInfoService,
    private config: ConfigService,
    private promoValidationService: PromoValidationService,
    private route: ActivatedRoute,
    private errorService: ErrorHandlingService
  ) {
    this.translationsLoaded$ = this.translationService.translationsLoaded$;
  }

  ngOnInit(): void {
    if (this.mboxData) {
      this.mboxInfoService.setMboxData(this.mboxData);
    }
    this.loadPlayerData();

    this.route.queryParams.subscribe((params) => {
      console.log("[PROMO_LIST] Paramètres d'URL reçus:", params);
      if (params['status']) {
        this.handleAuthResult(params);
      }
    });
  }

  loadPlayerData(): void {
    this.isLoading = true;
    this.error = null;
    this.promotions = [];

    const ownerId = this.mboxInfoService.getPlayerId();

    if (ownerId === '' || ownerId === '0') {
      console.log('[PROMO_LIST] Joueur anonyme détecté:', ownerId);
      this.isCustomer = false;
      this.isLoading = false;

      return;
    }

    this.promoService
      .checkPlayerStatus()
      .pipe(
        catchError((err) => {
          console.error(
            '[PROMO_LIST] Erreur lors de la vérification du statut du joueur:',
            err
          );
          this.isLoading = false;
          const normalizedError = this.errorService.normalizeHttpError(
            err,
            'PLAYER_STATUS_CHECK'
          );
          this.error = normalizedError.message;
          this.isCustomer = false;
          return of({ isCustomer: false, message: '' });
        })
      )
      .subscribe((status: PlayerStatus) => {
        if (this.error) {
          this.isCustomer = false;
          this.isLoading = false;
          return;
        }

        this.isCustomer = status.isCustomer;
        console.log("[PROMO_LIST] Statut du joueur depuis l'API:", status);

        if (this.isCustomer) {
          this.loadPromotions();
        } else {
          console.log(
            "[PROMO_LIST] ID joueur non vérifié par l'API (isCustomer: false), et non anonyme:",
            ownerId
          );

          this.error =
            this.errorService.getTranslatedErrorMessage('UNKNOWN_ERROR');

          this.isLoading = false;
        }
      });
  }

  loadPromotions(): void {
    this.promoService
      .getPlayerPromos()
      .pipe(
        catchError((err) => {
          console.error(
            '[PROMO_LIST] Erreur lors du chargement des promotions:',
            err
          );
          this.isLoading = false;
          const normalizedError = this.errorService.normalizeHttpError(
            err,
            'LOAD_PROMOTIONS'
          );
          this.error = normalizedError.message;

          return of({ data: [], message: '' });
        })
      )
      .subscribe((response) => {
        this.promotions = response.data;
        console.log(
          '[PROMO_LIST] Promotions chargées:',
          this.promotions.length
        );
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

  selectPromo(promo: Promotion, element: HTMLElement): void {
    console.log('[PROMO_LIST] Promotion sélectionnée:', promo);
    this.animationService.applyClickAnimation(element);

    const currentUrl = window.location.href.split('?')[0];
    const baseUrl = currentUrl.endsWith('/') ? currentUrl : `${currentUrl}/`;

    try {
      this.promoValidationService.requestPlayerAuthentication({
        promoId: promo.id,
        urlOnSuccess: `${baseUrl}?status=success&promoId=${promo.id}&rewardType=${promo.reward_type}&rewardValue=${promo.reward_value}`,
        urlOnFailure: `${baseUrl}?status=failure&promoId=${promo.id}`,
        urlOnError: `${baseUrl}?status=error&promoId=${promo.id}`,
        customPayload: {
          promoType: promo.promo_type,
          rewardType: promo.reward_type,
          rewardValue: promo.reward_value,
        },
      });
    } catch (error: any) {
      console.error(
        "[PROMO_LIST] Erreur lors de la demande d'authentification:",
        error
      );

      if (error && error.code) {
        this.showConfirmationScreen(
          this.errorService.toValidationResult(error, true)
        );
      } else {
        this.showConfirmationScreen(
          this.promoValidationService.handleMboxAuthError('MBOX_AUTH_ERROR')
        );
      }
    }
  }

  handleAuthResult(params: any): void {
    const status = params['status'];
    const promoId = parseInt(params['promoId'] || '0', 10);
    const code = params['code'] || '';

    console.log("[PROMO_LIST] Statut de retour d'authentification:", status);
    console.log('[PROMO_LIST] Paramètres:', params);

    switch (status) {
      case 'success':
        console.log(
          '[PROMO_LIST] Authentification réussie, vérification de la promotion'
        );

        if (code) {
          this.validateManualCode(code);
        } else if (promoId) {
          this.applyPromotion(promoId, params);
        } else {
          console.error(
            '[PROMO_LIST] Authentification réussie mais sans code ni promoId'
          );
        }
        break;

      case 'failure':
        console.log("[PROMO_LIST] Échec de l'authentification (PIN incorrect)");
        this.showConfirmationScreen(
          this.promoValidationService.handleMboxAuthError('PIN_INVALID')
        );
        break;

      case 'error':
        console.log("[PROMO_LIST] Erreur technique lors de l'authentification");
        this.showConfirmationScreen(
          this.promoValidationService.handleMboxAuthError('MBOX_AUTH_ERROR')
        );
        break;

      default:
        console.error('[PROMO_LIST] Status de retour inconnu:', status);
        this.showConfirmationScreen(
          this.promoValidationService.handleMboxAuthError('UNKNOWN_ERROR')
        );
        break;
    }
  }

  validateManualCode(code: string): void {
    console.log(
      '[PROMO_LIST] Validation du code manuel après auth réussie:',
      code
    );

    this.promoValidationService.validateCode(code).subscribe({
      next: (result) => {
        console.log('[PROMO_LIST] Résultat de validation du code:', result);

        if (result.isSuccess && result.promoId) {
          this.applyValidatedPromotion(result.promoId, result);
        } else {
          this.showConfirmationScreen(result);
        }
      },
      error: (error) => {
        console.error(
          '[PROMO_LIST] Erreur lors de la validation du code:',
          error
        );
        this.showConfirmationScreen({
          isSuccess: false,
          isMember: true,
          errorMessage:
            error.message || this.translate.instant('Errors.UNKNOWN_ERROR'),
          errorCode: 'VALIDATION_ERROR',
        });
      },
    });
  }

  applyPromotion(promoId: number, params: any): void {
    console.log(
      '[PROMO_LIST] Application de la promotion après auth réussie:',
      promoId
    );

    this.promoValidationService.applyValidatedPromo(promoId).subscribe({
      next: (result) => {
        if (result.isSuccess) {
          const enrichedResult: ValidationResult = {
            ...result,
            isSuccess: true,
            isMember: true,
            promoId: promoId,
            rewardType: params['rewardType'] || 'Point',
            rewardValue: parseInt(params['rewardValue'], 10) || 0,
          };

          console.log(
            '[PROMO_LIST] Promotion appliquée avec succès:',
            enrichedResult
          );
          this.showConfirmationScreen(enrichedResult);
          this.loadPromotions();
        } else {
          console.log(
            "[PROMO_LIST] Échec de l'application de la promotion:",
            result
          );
          this.showConfirmationScreen(result);
        }
      },
      error: (error) => {
        console.error(
          "[PROMO_LIST] Erreur lors de l'application de la promotion:",
          error
        );
        this.showConfirmationScreen({
          isSuccess: false,
          isMember: true,
          errorMessage:
            error.message || "Erreur lors de l'application de la promotion",
          errorCode: 'APPLICATION_ERROR',
        });
      },
    });
  }

  applyValidatedPromotion(
    promoId: number,
    validationResult: ValidationResult
  ): void {
    console.log('[PROMO_LIST] Application de la promotion validée:', promoId);

    this.promoValidationService.applyValidatedPromo(promoId).subscribe({
      next: (result) => {
        if (result.isSuccess) {
          const finalResult: ValidationResult = {
            isSuccess: true,
            isMember: true,
            promoId: promoId,
            rewardType: validationResult.rewardType,
            rewardValue: validationResult.rewardValue,
            newBalance: validationResult.newBalance,
          };

          console.log(
            '[PROMO_LIST] Promotion validée appliquée avec succès:',
            finalResult
          );
          this.showConfirmationScreen(finalResult);
          this.loadPromotions();
        } else {
          console.log(
            "[PROMO_LIST] Échec de l'application de la promotion validée:",
            result
          );
          this.showConfirmationScreen(result);
        }
      },
      error: (error) => {
        console.error(
          "[PROMO_LIST] Erreur lors de l'application de la promotion validée:",
          error
        );
        this.showConfirmationScreen({
          isSuccess: false,
          isMember: true,
          errorMessage:
            error.message || "Erreur lors de l'application de la promotion",
          errorCode: 'APPLICATION_ERROR',
        });
      },
    });
  }

  animateItem(index: number): boolean {
    return this.animationService.animateItem(index);
  }

  showEnterCodeScreen(): void {
    console.log("[PROMO_LIST] Ouverture de l'écran de saisie de code");
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
    console.log("[PROMO_LIST] Préparation de l'animation de retour");
    if (!this.isExitingPinCode) {
      this.isExitingPinCode = true;
      this.readyForPinCode = false;
      this.startReverseAnimation();
      this.isReturnFromPinCode = true;
    }
  }

  hideEnterCodeScreen(): void {
    console.log("[PROMO_LIST] Fermeture de l'écran de saisie de code");
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

  validateEnteredCode(code: string): void {
    console.log('[PROMO_LIST] Code saisi:', code);
  }

  showConfirmationScreen(data: ValidationResult): void {
    console.log("[PROMO_LIST] Affichage de l'écran de confirmation:", data);
    this.confirmationData = data;
    this.showConfirmation = true;

    if (data.isSuccess) {
      this.loadPromotions();
    }
  }

  hideConfirmationScreen(): void {
    console.log("[PROMO_LIST] Fermeture de l'écran de confirmation");
    this.showConfirmation = false;
  }

  backToPinCodeFromConfirmation(): void {
    console.log(
      "[PROMO_LIST] Retour à l'écran de saisie de code depuis la confirmation"
    );
    this.showConfirmation = false;
  }
}
