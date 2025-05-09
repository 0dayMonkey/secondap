import {
  Component,
  EventEmitter,
  Input,
  Output,
  ElementRef,
  OnInit,
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

@Component({
  selector: 'app-pin-code',
  templateUrl: './pin-code.component.html',
  styleUrls: ['./pin-code.component.scss'],
})
export class PinCodeComponent implements OnInit {
  @Input() pinTitle: string = '';
  @Input() placeholderText: string = '';
  @Input() validateButtonText: string = '';
  @Input() clearButtonText: string = 'C';
  @Input() translationsReady: boolean = false;

  @Output() validate = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
  @Output() startExitAnimation = new EventEmitter<void>();
  @Output() showConfirmation = new EventEmitter<ValidationResult>();

  voucherCode: string = '';
  isExiting: boolean = false;
  isLoading: boolean = false;

  constructor(
    private translate: TranslateService,
    private pinCodeService: PinCodeService,
    private config: ConfigService,
    private el: ElementRef,
    private promoValidationService: PromoValidationService,
    private errorService: ErrorHandlingService
  ) {}

  ngOnInit(): void {}

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

    console.log("[PIN_CODE] Demande d'authentification PIN initiée");
    console.log('[PIN_CODE] Code PIN: ' + this.voucherCode);

    try {
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
        customPayload: {
          code: this.voucherCode,
        },
      };

      console.log("[PIN_CODE] Paramètres de l'authentification:", {
        promoId: authRequest.promoId,
        urlOnSuccess: authRequest.urlOnSuccess,
        urlOnFailure: authRequest.urlOnFailure,
        urlOnError: authRequest.urlOnError,
      });

      this.promoValidationService.requestPlayerAuthentication(authRequest);

      setTimeout(() => {
        if (this.isLoading) {
          console.log("[PIN_CODE] Timeout de l'authentification PIN");
          this.isLoading = false;
          this.handleAuthenticationError('MBOX_TIMEOUT_ERROR');
        }
      }, 10000);
    } catch (error) {
      console.error(
        "[PIN_CODE] Erreur lors de la demande d'authentification PIN:",
        error
      );
      this.isLoading = false;
      this.handleAuthenticationError('MBOX_AUTH_ERROR');
    }
  }

  private handleAuthenticationError(errorCode: string): void {
    console.log(
      "[PIN_CODE] Gestion de l'erreur d'authentification:",
      errorCode
    );

    const errorResult =
      this.promoValidationService.handleMboxAuthError(errorCode);

    if (this.errorService.shouldClearPinCode(errorCode)) {
      this.clearCode();
    }

    this.exitWithConfirmation(errorResult);
  }

  validatePromotion(promoCode: string): void {
    this.promoValidationService.validateCode(promoCode).subscribe({
      next: (result: ValidationResult) => {
        this.isLoading = false;
        console.log('[PIN_CODE] Résultat de validation promotion:', result);

        if (result.isSuccess && result.promoId) {
          this.clearCode();
        } else if (
          result.errorCode &&
          this.errorService.shouldClearPinCode(result.errorCode)
        ) {
          console.log(
            `[PIN_CODE] Effacement du code PIN pour erreur: ${result.errorCode}`
          );
          this.clearCode();
        }

        this.exitWithConfirmation(result);
      },
      error: (error: any) => {
        console.error(
          '[PIN_CODE] Erreur lors de la validation de la promotion:',
          error
        );
        this.isLoading = false;

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
            this.promoValidationService.handleMboxAuthError('VALIDATION_ERROR');
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
