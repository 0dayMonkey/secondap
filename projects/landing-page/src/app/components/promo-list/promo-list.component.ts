import { Component, OnInit, Input, ViewChild } from '@angular/core';
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
import { PinCodeComponent } from '../pin-code/pin-code.component';

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
  @ViewChild(PinCodeComponent) pinCodeComponent!: PinCodeComponent;

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

    this.promoService
      .checkPlayerStatus()
      .pipe(
        catchError((err) => {
          console.error(
            '[PROMO_LIST] Erreur lors de la vérification du statut du joueur:',
            err
          );
          this.isLoading = false;
          return of({ isCustomer: false, message: '' });
        })
      )
      .subscribe((status: PlayerStatus) => {
        this.isCustomer = status.isCustomer;
        console.log('[PROMO_LIST] Statut du joueur:', status);

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
          console.error(
            '[PROMO_LIST] Erreur lors du chargement des promotions:',
            err
          );
          this.isLoading = false;
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

    // Préparation des URLs pour la redirection après authentification
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
    } catch (error) {
      console.error(
        "[PROMO_LIST] Erreur lors de la demande d'authentification:",
        error
      );
      // Afficher un message d'erreur à l'utilisateur
      this.showConfirmationScreen({
        isSuccess: false,
        isMember: true,
        errorMessage: this.translate.instant('Errors.MBOX_AUTH_ERROR'),
        errorCode: 'MBOX_AUTH_ERROR',
      });
    }
  }

  // Méthode pour gérer les retours d'authentification par URL
  handleAuthResult(params: any): void {
    const status = params['status'];
    const promoId = parseInt(params['promoId'] || '0', 10);
    const code = params['code'] || '';

    console.log("[PROMO_LIST] Statut de retour d'authentification:", status);
    console.log('[PROMO_LIST] Paramètres:', params);

    switch (status) {
      case 'success':
        // Authentification réussie
        console.log(
          '[PROMO_LIST] Authentification réussie, vérification de la promotion'
        );

        if (code) {
          // C'est un code saisi manuellement, on doit valider le code
          this.validateManualCode(code);
        } else if (promoId) {
          // C'est une promotion sélectionnée, on doit l'appliquer
          this.applyPromotion(promoId, params);
        } else {
          console.error(
            '[PROMO_LIST] Authentification réussie mais sans code ni promoId'
          );
        }
        break;

      case 'failure':
        // Échec de l'authentification (PIN incorrect)
        console.log("[PROMO_LIST] Échec de l'authentification (PIN incorrect)");
        this.showConfirmationScreen({
          isSuccess: false,
          isMember: true,
          errorMessage: this.translate.instant('Errors.PIN_INVALID'),
          errorCode: 'PIN_INVALID',
        });
        break;

      case 'error':
        // Erreur technique de la MBox
        console.log("[PROMO_LIST] Erreur technique lors de l'authentification");
        this.showConfirmationScreen({
          isSuccess: false,
          isMember: true,
          errorMessage: this.translate.instant('Errors.MBOX_AUTH_ERROR'),
          errorCode: 'MBOX_AUTH_ERROR',
        });
        break;

      default:
        console.error('[PROMO_LIST] Status de retour inconnu:', status);
        break;
    }
  }

  // Validation d'un code saisi manuellement après authentification réussie
  validateManualCode(code: string): void {
    console.log(
      '[PROMO_LIST] Validation du code manuel après auth réussie:',
      code
    );

    this.promoValidationService.validateCode(code).subscribe({
      next: (result) => {
        console.log('[PROMO_LIST] Résultat de validation du code:', result);

        if (result.isSuccess && result.promoId) {
          // Le code est valide, on applique la promotion
          this.applyValidatedPromotion(result.promoId, result);
        } else {
          // Le code est invalide, on affiche une erreur
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

  // Application d'une promotion sélectionnée après authentification réussie
  applyPromotion(promoId: number, params: any): void {
    console.log(
      '[PROMO_LIST] Application de la promotion après auth réussie:',
      promoId
    );

    this.promoValidationService.applyValidatedPromo(promoId).subscribe({
      next: (result) => {
        if (result.isSuccess) {
          // Enrichir le résultat avec les infos de la promotion
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
          this.loadPromotions(); // Recharger la liste des promotions
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

  // Application d'une promotion validée après authentification et validation réussies
  applyValidatedPromotion(
    promoId: number,
    validationResult: ValidationResult
  ): void {
    console.log('[PROMO_LIST] Application de la promotion validée:', promoId);

    this.promoValidationService.applyValidatedPromo(promoId).subscribe({
      next: (result) => {
        if (result.isSuccess) {
          // Combiner les résultats de validation et d'application
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
          this.loadPromotions(); // Recharger la liste des promotions
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
    // Cette méthode est appelée lorsque l'utilisateur saisit un code
    // Mais l'authentification est gérée par le composant PinCodeComponent
    // et la validation se fait après le retour de l'authentification
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
