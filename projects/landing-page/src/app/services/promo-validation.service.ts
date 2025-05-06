// projects/landing-page/src/app/services/promo-validation.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from '../../../../common/services/api.service';
import { MboxInfoService } from '../../../../common/services/mbox-info.service';
import { ErrorHandlingService, StimErrorCode } from './error-handler.service';

export interface ValidationResult {
  isSuccess: boolean;
  isMember: boolean;
  rewardValue?: number;
  rewardType?: string;
  newBalance?: number;
  errorMessage?: string;
  promoId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class PromoValidationService {
  constructor(
    private apiService: ApiService,
    private mboxService: MboxInfoService,
    private errorService: ErrorHandlingService
  ) {}

  validateCode(code: string): Observable<ValidationResult> {
    return this.apiService.validatePromoCode(code).pipe(
      map((response) => {
        if (response.valid && response.promo) {
          const isCustomer = this.mboxService.getPlayerId() !== '0';

          return {
            isSuccess: true,
            isMember: isCustomer,
            rewardValue: response.promo.reward_value,
            rewardType: response.promo.reward_type,
            newBalance: this.calculateNewBalance(
              response.promo.reward_value,
              response.promo.reward_type
            ),
            promoId: response.promo.id,
          };
        } else {
          return {
            isSuccess: false,
            isMember: this.mboxService.getPlayerId() !== '0',
            errorMessage:
              response.message ||
              this.errorService.getErrorMessage(StimErrorCode.STIM_INEXISTANTE),
          };
        }
      }),
      catchError((error) => {
        return of({
          isSuccess: false,
          isMember: this.mboxService.getPlayerId() !== '0',
          errorMessage: this.errorService.handleApiError(error),
        });
      })
    );
  }

  applyValidatedPromo(promoId: number): Observable<ValidationResult> {
    if (!promoId) {
      return throwError(
        () =>
          new Error(
            this.errorService.getErrorMessage(StimErrorCode.STIM_INEXISTANTE)
          )
      );
    }

    return this.apiService.usePromo(promoId).pipe(
      map((response) => {
        return {
          isSuccess: true,
          isMember: this.mboxService.getPlayerId() !== '0',
          message: response.message,
        };
      }),
      catchError((error) => {
        return of({
          isSuccess: false,
          isMember: this.mboxService.getPlayerId() !== '0',
          errorMessage: this.errorService.handleApiError(error),
        });
      })
    );
  }

  private calculateNewBalance(rewardValue: number, rewardType: string): number {
    return rewardValue + 1000;
  }
}
