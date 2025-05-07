import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from '../../../../common/services/api.service';
import { MboxInfoService } from '../../../../common/services/mbox-info.service';
import { ErrorHandlingService, StimErrorCode } from './error-handler.service';
import { requestPlayerPin } from 'mbox-opencontent-sdk';

export interface ValidationResult {
  isSuccess: boolean;
  isMember: boolean;
  rewardValue?: number;
  rewardType?: string;
  newBalance?: number;
  errorMessage?: string;
  promoId?: number;
  errorCode?: string;
}

export interface PlayerAuthRequest {
  promoId: number;
  urlOnSuccess: string;
  urlOnFailure: string;
  urlOnError: string;
  customPayload?: any;
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
          let errorCode: string | undefined;

          if (typeof response.message === 'string') {
            const match = response.message.match(/JOAPI_STIM_\d+/);
            if (match) {
              errorCode = match[0];
            }
          }

          return {
            isSuccess: false,
            isMember: this.mboxService.getPlayerId() !== '0',
            errorMessage:
              response.message ||
              this.errorService.getErrorMessage(StimErrorCode.STIM_INEXISTANTE),
            errorCode: errorCode,
          };
        }
      }),
      catchError((error) => {
        let errorCode: string | undefined;

        if (error.error && error.error.code) {
          errorCode = error.error.code;
        } else if (error.error && error.error.error && error.error.error.code) {
          errorCode = error.error.error.code;
        } else {
          const message = error.message || '';
          const match = message.match(/JOAPI_STIM_\d+/);
          if (match) {
            errorCode = match[0];
          } else {
            errorCode = 'UNKNOWN_ERROR';
          }
        }

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
        let errorCode = 'UNKNOWN_ERROR';
        if (error.error?.code) {
          errorCode = error.error.code;
        } else if (error.error?.error?.code) {
          errorCode = error.error.error.code;
        }

        console.error(
          "Erreur lors de l'application de la promotion:",
          error,
          'Code:',
          errorCode
        );

        return of({
          isSuccess: false,
          isMember: this.mboxService.getPlayerId() !== '0',
          errorMessage: this.errorService.getErrorMessage(errorCode),
          errorCode: errorCode,
        });
      })
    );
  }

  requestPlayerAuthentication(authRequest: PlayerAuthRequest): void {
    try {
      console.log("Appel à l'auth réussi");
      requestPlayerPin({
        appName: 'JOA MyPromo',
        urlOnSuccess: authRequest.urlOnSuccess,
        urlOnFailure: authRequest.urlOnFailure,
        urlOnError: authRequest.urlOnError,
        customPayload: authRequest.customPayload,
      });
    } catch (error) {
      console.log("Appel à l'auth échoué");
      console.error("Erreur lors de la demande d'authentification:", error);
    }
  }

  private calculateNewBalance(rewardValue: number, rewardType: string): number {
    return rewardValue + 1000;
  }
}
