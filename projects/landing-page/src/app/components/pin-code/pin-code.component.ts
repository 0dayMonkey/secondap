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

    // On lance uniquement l'authentification du joueur
    // La validation de la promotion se fera après succès de l'authentification
    // via les redirections URL
    this.requestPlayerAuthentication();
  }

  // Authentification du joueur uniquement
  private requestPlayerAuthentication(): void {
    const currentUrl = window.location.href.split('?')[0];
    const baseUrl = currentUrl.endsWith('/') ? currentUrl : `${currentUrl}/`;

    console.log("[PIN_CODE] Demande d'authentification PIN initiée");
    console.log('[PIN_CODE] Code PIN: ' + this.voucherCode);

    try {
      // Extraire un ID de promotion du code (si possible)
      let promoId = 0;
      try {
        promoId = parseInt(this.voucherCode.replace(/-/g, ''));
        if (isNaN(promoId)) promoId = 0;
      } catch (e) {
        promoId = 0;
      }

      // Préparer les URL de redirection en incluant le code promotionnel
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

      // Demande d'authentification du joueur via la MBox
      this.promoValidationService.requestPlayerAuthentication(authRequest);

      // En cas de succès, la MBox redirigera vers urlOnSuccess
      // En cas d'échec d'auth, la MBox redirigera vers urlOnFailure
      // En cas d'erreur technique, la MBox redirigera vers urlOnError

      // En attendant, on peut montrer l'écran de confirmation avec un message d'attente
      // ou simplement laisser le système de redirection MBox s'occuper de tout

      // Si pour une raison quelconque la MBox ne redirige pas, on peut gérer un timeout
      setTimeout(() => {
        if (this.isLoading) {
          console.log("[PIN_CODE] Timeout de l'authentification PIN");
          this.isLoading = false;
          this.handleAuthenticationError('MBOX_TIMEOUT_ERROR');
        }
      }, 10000); // 10 secondes de timeout
    } catch (error) {
      console.error(
        "[PIN_CODE] Erreur lors de la demande d'authentification PIN:",
        error
      );
      this.isLoading = false;
      this.handleAuthenticationError('MBOX_AUTH_ERROR');
    }
  }

  // Gestion des erreurs d'authentification MBox
  private handleAuthenticationError(errorCode: string): void {
    console.log(
      "[PIN_CODE] Gestion de l'erreur d'authentification:",
      errorCode
    );

    // Ici on peut effacer le code PIN si nécessaire pour certaines erreurs
    if (errorCode === 'MBOX_AUTH_ERROR') {
      this.clearCode();
    }

    // Afficher un message d'erreur approprié
    const errorResult: ValidationResult = {
      isSuccess: false,
      isMember: false,
      errorMessage: this.translate.instant('Errors.MBOX_AUTH_ERROR'),
      errorCode: errorCode,
    };

    this.exitWithConfirmation(errorResult);
  }

  // Cette méthode est appelée à partir de PromoListComponent
  // lorsque l'authentification a réussi et qu'on veut valider la promotion
  validatePromotion(promoCode: string): void {
    this.promoValidationService.validateCode(promoCode).subscribe({
      next: (result: ValidationResult) => {
        this.isLoading = false;
        console.log('[PIN_CODE] Résultat de validation promotion:', result);

        if (result.isSuccess && result.promoId) {
          // Promotion validée
          this.clearCode();
        } else {
          // Échec de validation de promotion
          if (result.errorCode && this.shouldClearCode(result.errorCode)) {
            console.log(
              `[PIN_CODE] Effacement du code PIN pour erreur: ${result.errorCode}`
            );
            this.clearCode();
          }
        }

        this.exitWithConfirmation(result);
      },
      error: (error) => {
        console.error(
          '[PIN_CODE] Erreur lors de la validation de la promotion:',
          error
        );
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
          const match = error.message.match(/JOAPI_STIM_\d+/);
          if (match) {
            errorCode = match[0];
          }
        }

        // Vérifier si on doit effacer le code
        if (errorCode && this.shouldClearCode(errorCode)) {
          console.log(
            `[PIN_CODE] Effacement du code PIN pour erreur: ${errorCode}`
          );
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

  // Méthode pour déterminer si le code doit être effacé
  private shouldClearCode(errorCode: string): boolean {
    console.log(
      `[PIN_CODE] Vérification d'effacement pour le code: ${errorCode}`
    );
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
