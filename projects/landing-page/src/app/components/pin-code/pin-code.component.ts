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
} from '../../services/promo-validation.service';

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

  @Output() validate = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
  @Output() startExitAnimation = new EventEmitter<void>();
  @Output() showConfirmation = new EventEmitter<ValidationResult>();

  voucherCode: string = '';
  isExiting: boolean = false;
  isLoading: boolean = false;

  // Codes d'erreur qui nécessitent l'effacement du code PIN
  private errorCodesToClear: string[] = [
    'JOAPI_STIM_0003',
    'JOAPI_STIM_0004',
    'JOAPI_STIM_0005',
    'JOAPI_STIM_0006',
    'JOAPI_STIM_0007',
    'JOAPI_STIM_0009',
    'JOAPI_STIM_0011',
    'JOAPI_STIM_0012',
    'JOAPI_STIM_0013',
    'JOAPI_STIM_0017',
  ];

  constructor(
    private translate: TranslateService,
    private pinCodeService: PinCodeService,
    private config: ConfigService,
    private el: ElementRef,
    private promoValidationService: PromoValidationService
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

    this.promoValidationService.validateCode(this.voucherCode).subscribe({
      next: (result: ValidationResult) => {
        this.isLoading = false;

        console.log('Résultat de validation:', result);

        if (result.isSuccess && result.promoId) {
          // Déplacer l'authentification ici, avant de montrer la confirmation
          const currentUrl = window.location.href.split('?')[0];
          const baseUrl = currentUrl.endsWith('/')
            ? currentUrl
            : `${currentUrl}/`;

          // Appeler requestPlayerAuthentication immédiatement après la validation réussie
          this.promoValidationService.requestPlayerAuthentication({
            promoId: result.promoId,
            urlOnSuccess: `${baseUrl}?status=success&promoId=${result.promoId}&rewardType=${result.rewardType}&rewardValue=${result.rewardValue}`,
            urlOnFailure: `${baseUrl}?status=failure&promoId=${result.promoId}`,
            urlOnError: `${baseUrl}?status=error&promoId=${result.promoId}`,
            customPayload: {
              code: this.voucherCode,
              rewardType: result.rewardType,
              rewardValue: result.rewardValue,
            },
          });

          // Comme c'est validé, on efface le code
          this.clearCode();
          this.exitWithConfirmation(result);
        } else {
          // Si c'est un échec, vérifier si on doit effacer le code
          if (result.errorCode && this.shouldClearCode(result.errorCode)) {
            this.clearCode();
          }
          this.exitWithConfirmation(result);
        }
      },
      error: (error) => {
        console.error('Erreur lors de la validation du code:', error);
        this.isLoading = false;

        let errorMessage = 'Erreur de connexion au serveur';
        let errorCode = '';

        if (error.error && error.error.code) {
          errorCode = error.error.code;
          errorMessage = error.error.message || errorMessage;
        } else if (error.error && error.error.error && error.error.error.code) {
          errorCode = error.error.error.code;
          errorMessage = error.error.error.message || errorMessage;
        } else if (error.message) {
          errorMessage = error.message;
          // Tentative d'extraction du code d'erreur du message
          const match = error.message.match(/JOAPI_STIM_\d+/);
          if (match) {
            errorCode = match[0];
          }
        }

        // Vérifier si on doit effacer le code
        if (errorCode && this.shouldClearCode(errorCode)) {
          this.clearCode();
        }

        this.exitWithConfirmation({
          isSuccess: false,
          isMember: false,
          errorMessage: errorMessage,
          errorCode: errorCode,
        });
      },
    });
  }

  // Nouvelle méthode pour déterminer si le code doit être effacé
  private shouldClearCode(errorCode: string): boolean {
    // Si la validation a réussi ou si c'est l'un des codes d'erreur spécifiés
    return this.errorCodesToClear.includes(errorCode);
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
