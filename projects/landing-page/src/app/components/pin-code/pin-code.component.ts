import {
  Component,
  EventEmitter,
  Input,
  Output,
  ElementRef,
  OnInit,
  OnDestroy,
  OnChanges, // Ajoutez OnChanges
  SimpleChanges, // Ajoutez SimpleChanges
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PinCodeService } from '../../services/pin-code.service';
import { ConfigService } from 'projects/common/services/config.service';
import {
  PromoValidationService,
  ValidationResult,
  PlayerAuthRequest,
} from '../../services/promo-validation.service';
import { ErrorHandlingService } from '../../services/error-handler.service';
import { Subject, of } from 'rxjs'; // Ajoutez of
import { takeUntil, finalize, delay } from 'rxjs/operators';

@Component({
  selector: 'app-pin-code',
  templateUrl: './pin-code.component.html',
  styleUrls: ['./pin-code.component.scss'],
})
export class PinCodeComponent implements OnInit, OnDestroy, OnChanges {
  // Ajoutez OnChanges
  @Input() pinTitle: string = '';
  @Input() placeholderText: string = '';
  @Input() validateButtonText: string = '';
  @Input() clearButtonText: string = 'C';
  @Input() initialLoadingState: boolean = true; // Nouvel Input

  @Output() validate = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
  @Output() startExitAnimation = new EventEmitter<void>();
  @Output() showConfirmation = new EventEmitter<ValidationResult>();

  voucherCode: string = '';
  isExiting: boolean = false;
  isLoading: boolean = false;
  isPinCodeLoading: boolean = true; // Pour le skeleton initial du composant

  private destroy$ = new Subject<void>();
  private readonly SIMULATED_DELAY = 0; // Mettez à 2000 pour tester, 0 pour normal

  constructor(
    private translate: TranslateService,
    private pinCodeService: PinCodeService,
    private config: ConfigService,
    private el: ElementRef,
    private promoValidationService: PromoValidationService,
    private errorService: ErrorHandlingService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Gérez les changements de l'Input
    if (changes['initialLoadingState']) {
      this.isPinCodeLoading = changes['initialLoadingState'].currentValue;
    }
  }

  ngOnInit(): void {
    // Utilise la valeur de l'Input initialement
    this.isPinCodeLoading = this.initialLoadingState;

    // Si on veut toujours un petit délai propre à PinCode après le délai global
    // pour s'assurer que les traductions spécifiques à PinCode sont prêtes
    // (par exemple, si PinCode avait ses propres clés de traduction chargées dynamiquement)
    // on pourrait faire :
    if (this.SIMULATED_DELAY > 0 && !this.initialLoadingState) {
      // Si pas déjà en chargement global
      this.isPinCodeLoading = true;
      setTimeout(() => {
        this.isPinCodeLoading = false;
      }, this.SIMULATED_DELAY / 2); // Un délai plus court pour le rendu
    } else if (this.initialLoadingState) {
      // Si initialLoadingState est true, on attend qu'il devienne false via ngOnChanges
    } else {
      // Si initialLoadingState est false et pas de SIMULATED_DELAY, on affiche direct.
      this.isPinCodeLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  appendDigit(digit: string): void {
    this.voucherCode += digit;
    this.voucherCode = this.pinCodeService.formatVoucherCode(this.voucherCode);
  }

  removeLastDigit(): void {
    if (this.voucherCode.endsWith('-')) {
      this.voucherCode = this.voucherCode.slice(0, -2);
    } else {
      this.voucherCode = this.voucherCode.slice(0, -1);
    }
  }

  clearCode(): void {
    this.voucherCode = '';
  }

  validateCode(): void {
    if (!this.isValidCode() || this.isLoading) {
      return;
    }
    this.isLoading = true;
    this.validate.emit(this.voucherCode);
    this.requestPlayerAuthentication();
  }

  private requestPlayerAuthentication(): void {
    const currentUrl = window.location.href.split('?')[0];
    const baseUrl = currentUrl.endsWith('/') ? currentUrl : `${currentUrl}/`;
    let promoId = 0;
    try {
      promoId = parseInt(this.voucherCode.replace(/-/g, ''));
      if (isNaN(promoId)) promoId = 0;
    } catch (e) {
      promoId = 0;
    }
    const authRequest: PlayerAuthRequest = {
      promoId: promoId,
      urlOnSuccess: `${baseUrl}?status=success&code=${this.voucherCode}`,
      urlOnFailure: `${baseUrl}?status=failure&code=${this.voucherCode}`,
      urlOnError: `${baseUrl}?status=error&code=${this.voucherCode}`,
      customPayload: { code: this.voucherCode },
    };

    // Simuler un délai pour voir le skeleton du bouton "isLoading"
    of(null)
      .pipe(delay(this.SIMULATED_DELAY / 2), takeUntil(this.destroy$))
      .subscribe(() => {
        try {
          this.promoValidationService.requestPlayerAuthentication(authRequest);
          setTimeout(() => {
            if (this.isLoading) {
              this.isLoading = false;
              this.handleAuthenticationError('MBOX_TIMEOUT_ERROR');
            }
          }, 10000); // 10 secondes de timeout MBox
        } catch (error) {
          this.isLoading = false;
          this.handleAuthenticationError('MBOX_AUTH_ERROR');
        }
      });
  }

  private handleAuthenticationError(errorCode: string): void {
    const errorResult =
      this.promoValidationService.handleMboxAuthError(errorCode);
    if (this.errorService.shouldClearPinCode(errorCode)) {
      this.clearCode();
    }
    this.isLoading = false;
    this.exitWithConfirmation(errorResult);
  }

  validatePromotion(promoCode: string): void {
    this.isLoading = true;
    this.promoValidationService
      .validateCode(promoCode)
      .pipe(
        delay(this.SIMULATED_DELAY),
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (result: ValidationResult) => {
          if (result.isSuccess && result.promoId) {
            this.clearCode();
          } else if (
            result.errorCode &&
            this.errorService.shouldClearPinCode(result.errorCode)
          ) {
            this.clearCode();
          }
          this.exitWithConfirmation(result);
        },
        error: (error: any) => {
          let errorResult: ValidationResult;
          if (error && error.code) {
            errorResult = this.errorService.toValidationResult(error, false);
            if (
              error.requirePinClear ||
              this.errorService.shouldClearPinCode(error.code)
            ) {
              this.clearCode();
            }
          } else {
            errorResult =
              this.promoValidationService.handleMboxAuthError(
                'VALIDATION_ERROR'
              );
            this.clearCode();
          }
          this.exitWithConfirmation(errorResult);
        },
      });
  }

  private exitWithConfirmation(result: ValidationResult): void {
    this.startExitAnimation.emit();
    setTimeout(() => {
      this.showConfirmation.emit(result);
    }, this.config.viewTransitionDelay);
  }

  goBack(skipEmit: boolean = false): void {
    if (!this.isExiting) {
      this.isExiting = true;
      const container = this.el.nativeElement.querySelector(
        '.pin-code-container'
      );
      container.classList.add('slide-out');
      if (!skipEmit) {
        this.startExitAnimation.emit();
      }
      setTimeout(() => {
        this.cancel.emit();
        this.isExiting = false;
      }, this.config.viewTransitionDelay);
    }
  }

  isValidCode(): boolean {
    return this.pinCodeService.isValidCode(this.voucherCode);
  }
}
