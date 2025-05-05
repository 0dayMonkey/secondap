import {
  Component,
  EventEmitter,
  Input,
  Output,
  ElementRef,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PinCodeService } from '../../services/pin-code.service';
import { ConfigService } from 'projects/common/services/config.service';

@Component({
  selector: 'app-pin-code',
  templateUrl: './pin-code.component.html',
  styleUrls: ['./pin-code.component.scss'],
})
export class PinCodeComponent {
  @Input() pinTitle: string = '';
  @Input() placeholderText: string = '';
  @Input() validateButtonText: string = '';
  @Input() clearButtonText: string = 'C';

  @Output() validate = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
  @Output() startExitAnimation = new EventEmitter<void>();

  voucherCode: string = '';
  isExiting: boolean = false;

  constructor(
    private translate: TranslateService,
    private pinCodeService: PinCodeService,
    private config: ConfigService,
    private el: ElementRef
  ) {}

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
    this.validate.emit(this.voucherCode);
  }

  goBack(): void {
    if (!this.isExiting) {
      this.isExiting = true;

      const container = this.el.nativeElement.querySelector(
        '.pin-code-container'
      );
      container.classList.add('slide-out');

      this.startExitAnimation.emit();

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
