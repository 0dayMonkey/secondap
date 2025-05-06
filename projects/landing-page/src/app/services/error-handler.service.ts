// projects/landing-page/src/app/services/error-handling.service.ts
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export enum StimErrorCode {
  STIM_INEXISTANTE = 'JOAPI_STIM_0001',
  AUCUN_CLIENT = 'JOAPI_STIM_0002',
  CLIENT_INTERDIT = 'JOAPI_STIM_0003',
  STATUT_INVALIDE = 'JOAPI_STIM_0004',
  CLOTUREE = 'JOAPI_STIM_0005',
  NOMBRE_UTILISATION = 'JOAPI_STIM_0006',
  PERIODE_VALIDITE = 'JOAPI_STIM_0007',
  ETABLISSEMENT_UTILISATION = 'JOAPI_STIM_0008',
  DELAI_UTILISATION = 'JOAPI_STIM_0009',
  ETABLISSEMENT_UTILISATION_NULL = 'JOAPI_STIM_0011',
  PERIODE_NULL = 'JOAPI_STIM_0012',
  ETABLISSEMENT_CONSOMMATION_INCONNU = 'JOAPI_STIM_0013',
  NON_HABILITE = 'JOAPI_STIM_0017',
  API_COMMUNICATION_ERROR = 'API_COMMUNICATION_ERROR',
}

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlingService {
  constructor(private translate: TranslateService) {}

  getErrorMessage(errorCode: string): string {
    const errorKey = `Errors.${errorCode}`;
    const fallbackKey = 'Errors.UNKNOWN_ERROR';

    if (this.translate.instant(errorKey) !== errorKey) {
      return this.translate.instant(errorKey);
    }

    return this.translate.instant(fallbackKey);
  }

  handleApiError(error: any): string {
    if (!error.error || !error.error.code) {
      return this.getErrorMessage(StimErrorCode.API_COMMUNICATION_ERROR);
    }

    return this.getErrorMessage(error.error.code);
  }
}
