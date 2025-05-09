import { Component, OnInit, Input, ViewChild, OnDestroy } from '@angular/core'; // Ajoutez OnDestroy
import { TranslateService } from '@ngx-translate/core';
import { TranslationService } from '../../services/translation.service';
import { PromoService } from '../../services/promo.service';
import { catchError, of, finalize, delay, Subject, takeUntil } from 'rxjs'; // Ajoutez Subject, takeUntil
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
export class PromoListComponent implements OnInit, OnDestroy {
  promotions: Promotion[] = [];
  isCustomer = false;
  isLoading = true; // Pour les chargements généraux (ex: liste des promos après init)
  isLoadingInitialData = true; // Pour le chargement initial de la page (status joueur, etc.)
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

  private readonly SIMULATED_DELAY = 2000; // Mettez à 2000 pour tester, 0 pour normal
  private destroy$ = new Subject<void>();

  constructor(
    private promoService: PromoService,
    private translate: TranslateService,
    private formatService: FormattingService,
    private animationService: AnimationService,
    private mboxInfoService: MboxInfoService,
    private config: ConfigService,
    private promoValidationService: PromoValidationService,
    private route: ActivatedRoute,
    private errorService: ErrorHandlingService
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.isLoadingInitialData = true;

    // Attendre que les traductions soient chargées (géré par APP_INITIALIZER)
    // Puis simuler le chargement des données
    this.translate
      .get('PromoList.enterCode')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Les traductions de base sont prêtes, on peut charger les données du joueur
        if (this.mboxData) {
          this.mboxInfoService.setMboxData(this.mboxData);
        }
        this.loadPlayerData();
      });

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        if (params['status']) {
          this.handleAuthResult(params);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPlayerData(): void {
    this.isLoading = true; // Peut être utilisé pour un spinner global si voulu
    this.isLoadingInitialData = true;
    this.error = null;
    this.promotions = [];

    const ownerId = this.mboxInfoService.getPlayerId();

    // Simuler un délai pour le chargement initial des données
    // Cela permet de voir le skeleton même si les traductions sont déjà en cache.
    of(null)
      .pipe(delay(this.SIMULATED_DELAY), takeUntil(this.destroy$))
      .subscribe(() => {
        if (ownerId === '' || ownerId === '0') {
          this.isCustomer = false;
          this.isLoading = false;
          this.isLoadingInitialData = false;
          return;
        }

        this.promoService
          .checkPlayerStatus()
          .pipe(
            // Le délai est maintenant global avant cet appel
            catchError((err) => {
              const normalizedError = this.errorService.normalizeHttpError(
                err,
                'PLAYER_STATUS_CHECK'
              );
              this.error = normalizedError.message;
              this.isCustomer = false;
              return of({ isCustomer: false, message: '' });
            }),
            finalize(() => {
              this.isLoading = false; // Fin du chargement principal des données
              this.isLoadingInitialData = false; // Fin du chargement initial
            }),
            takeUntil(this.destroy$)
          )
          .subscribe((status: PlayerStatus) => {
            if (this.error) {
              this.isCustomer = false;
              return;
            }
            this.isCustomer = status.isCustomer;
            if (this.isCustomer) {
              this.loadPromotions(); // Charge les promotions spécifiques si client
            } else {
              // Si pas client mais avait un ownerId, c'est une sorte d'erreur/incohérence
              if (ownerId && ownerId !== '0') {
                this.error =
                  this.errorService.getTranslatedErrorMessage('UNKNOWN_ERROR');
              }
            }
          });
      });
  }

  loadPromotions(): void {
    // Ce isLoading est pour le rechargement de la liste de promotions,
    // pas pour le chargement initial de la page.
    this.isLoading = true;
    this.error = null; // Réinitialiser l'erreur avant de charger les promotions
    this.promoService
      .getPlayerPromos()
      .pipe(
        delay(this.SIMULATED_DELAY), // Garder un délai pour voir le rechargement des promos elles-mêmes si besoin
        catchError((err) => {
          const normalizedError = this.errorService.normalizeHttpError(
            err,
            'LOAD_PROMOTIONS'
          );
          this.error = normalizedError.message;
          this.promotions = []; // S'assurer que la liste est vide en cas d'erreur
          return of({ data: [], message: '' });
        }),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((response) => {
        this.promotions = response.data;
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
    switch (status) {
      case 'success':
        if (code) {
          this.validateManualCode(code);
        } else if (promoId) {
          this.applyPromotion(promoId, params);
        }
        break;
      case 'failure':
        this.showConfirmationScreen(
          this.promoValidationService.handleMboxAuthError('PIN_INVALID')
        );
        break;
      case 'error':
      default:
        this.showConfirmationScreen(
          this.promoValidationService.handleMboxAuthError('MBOX_AUTH_ERROR') // MBOX_AUTH_ERROR ou UNKNOWN_ERROR selon la cause
        );
        break;
    }
  }

  validateManualCode(code: string): void {
    this.isLoading = true;
    this.promoValidationService
      .validateCode(code)
      .pipe(
        delay(this.SIMULATED_DELAY),
        finalize(() => (this.isLoading = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (result) => {
          if (result.isSuccess && result.promoId) {
            this.applyValidatedPromotion(result.promoId, result);
          } else {
            this.showConfirmationScreen(result);
          }
        },
        error: (error) => {
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
    this.isLoading = true;
    this.promoValidationService
      .applyValidatedPromo(promoId)
      .pipe(
        delay(this.SIMULATED_DELAY),
        finalize(() => (this.isLoading = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
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
            this.showConfirmationScreen(enrichedResult);
            this.loadPromotions();
          } else {
            this.showConfirmationScreen(result);
          }
        },
        error: (error) => {
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
    this.isLoading = true;
    this.promoValidationService
      .applyValidatedPromo(promoId)
      .pipe(
        delay(this.SIMULATED_DELAY),
        finalize(() => (this.isLoading = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
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
            this.showConfirmationScreen(finalResult);
            this.loadPromotions();
          } else {
            this.showConfirmationScreen(result);
          }
        },
        error: (error) => {
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
  }

  hideConfirmationScreen(): void {
    this.showConfirmation = false;
  }

  backToPinCodeFromConfirmation(): void {
    this.showConfirmation = false;
  }
}
