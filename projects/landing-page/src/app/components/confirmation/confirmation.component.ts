import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ElementRef,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ConfigService } from 'projects/common/services/config.service';
import { FormattingService } from '../../services/formatting.service';
import { MboxInfoService } from 'projects/common/services/mbox-info.service';

export interface ConfirmationData {
  isSuccess: boolean;
  isMember: boolean;
  rewardValue?: number;
  rewardType?: string;
  newBalance?: number;
  errorMessage?: string;
}

@Component({
  selector: 'app-confirmation',
  templateUrl: './confirmation.component.html',
  styleUrls: ['./confirmation.component.scss'],
})
export class ConfirmationComponent implements OnInit {
  @Input() data: ConfirmationData = {
    isSuccess: true,
    isMember: true,
  };

  @Output() close = new EventEmitter<void>();

  isSuccess: boolean = true;
  titleText: string = '';
  messageText: string = '';
  subMessageText: string = '';
  animationStarted: boolean = false;
  isExiting: boolean = false;

  constructor(
    private translate: TranslateService,
    private config: ConfigService,
    private formatService: FormattingService,
    private mboxService: MboxInfoService,
    private el: ElementRef
  ) {}

  ngOnInit(): void {
    this.isSuccess = this.data.isSuccess;
    this.setTexts();

    setTimeout(() => {
      this.animationStarted = true;
    }, 100);
  }

  private setTexts(): void {
    if (this.isSuccess) {
      this.titleText = this.translate.instant('Confirmation.successTitle');

      if (this.data.isMember) {
        const formattedReward = this.formatReward(
          this.data.rewardValue || 0,
          this.data.rewardType || 'credits'
        );

        const formattedBalance = this.formatReward(
          this.data.newBalance || 0,
          this.data.rewardType || 'credits'
        );

        const rewardTypeText =
          this.data.rewardType === 'credits'
            ? this.translate.instant('Confirmation.pointsBalance')
            : this.translate.instant('Confirmation.cashBalance');

        this.messageText = this.translate.instant(
          'Confirmation.memberSuccessMessage',
          {
            reward: formattedReward,
            rewardType: this.translate.instant('Confirmation.memberRewardType'),
          }
        );

        this.subMessageText = this.translate.instant(
          'Confirmation.balanceMessage',
          {
            rewardType: rewardTypeText,
            balance: formattedBalance,
          }
        );
      } else {
        const formattedReward = this.formatReward(
          this.data.rewardValue || 0,
          this.data.rewardType || 'credits'
        );

        this.messageText = this.translate.instant(
          'Confirmation.nonMemberSuccessMessage',
          {
            reward: formattedReward,
            rewardType: this.translate.instant(
              'Confirmation.machineRewardType'
            ),
          }
        );
      }
    } else {
      this.titleText = this.translate.instant('Confirmation.errorTitle');
      this.messageText = this.translate.instant('Confirmation.errorMessage', {
        error:
          this.data.errorMessage ||
          this.translate.instant('Confirmation.genericError'),
      });
    }
  }

  private formatReward(value: number, type: string): string {
    if (type === 'credits') {
      return this.translate.instant('PromoList.bonusPoints', {
        value: value,
      });
    } else {
      return this.formatService.formatReward({
        id: 0,
        code: '',
        title: '',
        reward_type: 'cash',
        reward_value: value,
        promo_type: '',
      });
    }
  }

  goBack(): void {
    if (!this.isExiting) {
      this.isExiting = true;

      const container = this.el.nativeElement.querySelector(
        '.confirmation-container'
      );
      container.classList.remove('slide-in');
      container.classList.add('slide-out');

      setTimeout(() => {
        this.close.emit();
        this.isExiting = false;
      }, this.config.viewTransitionDelay);
    }
  }
}
