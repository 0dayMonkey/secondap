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

          console.log("[PROMO_SERVICE] Code d'erreur extrait:", errorCode);

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
        let errorMessage: string = 'Erreur inconnue';

        if (error.error && error.error.code) {
          errorCode = error.error.code;
          errorMessage = error.error.message || 'Erreur inconnue';
        } else if (error.error && error.error.error && error.error.error.code) {
          errorCode = error.error.error.code;
          errorMessage = error.error.error.message || 'Erreur inconnue';
        } else {
          const message = error.message || '';
          const match = message.match(/JOAPI_STIM_\d+/);
          if (match) {
            errorCode = match[0];
          } else {
            errorCode = 'UNKNOWN_ERROR';
          }
          errorMessage = error.message || 'Erreur inconnue';
        }

        console.log(
          "[PROMO_SERVICE] Code d'erreur extrait de l'erreur:",
          errorCode
        );

        return of({
          isSuccess: false,
          isMember: this.mboxService.getPlayerId() !== '0',
          errorMessage: this.errorService.handleApiError(error) || errorMessage,
          errorCode: errorCode,
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
        let errorMessage = 'Erreur inconnue';

        if (error.error?.code) {
          errorCode = error.error.code;
          errorMessage = error.error.message || 'Erreur inconnue';
        } else if (error.error?.error?.code) {
          errorCode = error.error.error.code;
          errorMessage = error.error.error.message || 'Erreur inconnue';
        } else {
          const message = error.message || '';
          const match = message.match(/JOAPI_STIM_\d+/);
          if (match) {
            errorCode = match[0];
          }
        }

        console.error(
          "[PROMO_SERVICE] Erreur lors de l'application de la promotion:",
          error,
          'Code:',
          errorCode
        );

        return of({
          isSuccess: false,
          isMember: this.mboxService.getPlayerId() !== '0',
          errorMessage:
            this.errorService.getErrorMessage(errorCode) || errorMessage,
          errorCode: errorCode,
        });
      })
    );
  }

  requestPlayerAuthentication(authRequest: PlayerAuthRequest): void {
    try {
      console.log("[PROMO_SERVICE] Appel à l'authentification PIN - START");
      console.log('[PROMO_SERVICE] Paramètres:', {
        promoId: authRequest.promoId,
        urlOnSuccess: authRequest.urlOnSuccess,
        urlOnFailure: authRequest.urlOnFailure,
        urlOnError: authRequest.urlOnError,
        payload: authRequest.customPayload,
      });

      requestPlayerPin({
        appName: 'JOA MyPromo',
        urlOnSuccess: authRequest.urlOnSuccess,
        urlOnFailure: authRequest.urlOnFailure,
        urlOnError: authRequest.urlOnError,
        customPayload: authRequest.customPayload,
      });

      console.log("[PROMO_SERVICE] Appel à l'authentification PIN - SUCCESS");
      console.log('[PROMO_SERVICE] Attente de redirection par la MBox...');
    } catch (error) {
      console.log("[PROMO_SERVICE] Appel à l'authentification PIN - ÉCHEC");
      console.error(
        "[PROMO_SERVICE] Erreur lors de la demande d'authentification:",
        error
      );

      throw new Error('MBOX_AUTH_ERROR');
    }
  }

  private calculateNewBalance(rewardValue: number, rewardType: string): number {
    return rewardValue + 1000;
  }
}
