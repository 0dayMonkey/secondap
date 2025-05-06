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

        if (result.isSuccess && result.promoId) {
          this.promoValidationService
            .applyValidatedPromo(result.promoId)
            .subscribe({
              next: (applyResult: ValidationResult) => {
                if (applyResult.isSuccess) {
                  this.exitWithConfirmation(result);
                } else {
                  this.exitWithConfirmation({
                    isSuccess: false,
                    isMember: result.isMember,
                    errorMessage: applyResult.errorMessage,
                  });
                }
              },
              error: (error) => {
                this.exitWithConfirmation({
                  isSuccess: false,
                  isMember: result.isMember,
                  errorMessage:
                    error.message ||
                    "Erreur lors de l'application de la promotion",
                });
              },
            });
        } else {
          this.exitWithConfirmation(result);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.exitWithConfirmation({
          isSuccess: false,
          isMember: false,
          errorMessage: error.message || 'Erreur de connexion au serveur',
        });
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
