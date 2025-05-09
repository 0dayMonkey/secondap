import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ValidationResult } from './promo-validation.service';
import { AppConfigService } from './app-config.service';
import {
  StimErrorCode,
  MboxErrorCode,
  ApplicationErrorCode,
} from '../../../../common/models/error.codes';

export interface ErrorContext {
  component?: string;
  action?: string;
  additionalData?: any;
}

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlingService {
  private errorCodesToClear: string[];

  constructor(
    private translate: TranslateService,
    private appConfigService: AppConfigService
  ) {
    this.errorCodesToClear =
      this.appConfigService.config.validation.promoCode.clearInputOnErrorCodes;
  }

  createValidationResult(
    isSuccess: boolean,
    isMember: boolean,
    errorMessage?: string,
    errorCode?: string
  ): ValidationResult {
    const errorConf = this.appConfigService.config.errorHandling;
    return {
      isSuccess,
      isMember,
      errorMessage:
        errorMessage ||
        this.getTranslatedErrorMessage(errorConf.defaultUnknownErrorMessageKey),
      errorCode: errorCode || ApplicationErrorCode.UNKNOWN_ERROR,
    };
  }

  normalizeHttpError(error: HttpErrorResponse, context?: string): any {
    const errorCode = this.extractErrorCodeFromHttpResponse(error);
    const requirePinClear = this.shouldClearPinCode(errorCode);

    return {
      code: errorCode,
      message: this.getTranslatedErrorMessage(errorCode),
      requirePinClear: requirePinClear,
      originalError: error,
      context: context,
    };
  }

  normalizeMboxError(error: any, context?: string): any {
    let errorCode = MboxErrorCode.MBOX_AUTH_ERROR as string;

    if (
      typeof error === 'string' &&
      Object.values(MboxErrorCode).includes(error as MboxErrorCode)
    ) {
      errorCode = error as MboxErrorCode;
    } else if (
      error?.code &&
      Object.values(MboxErrorCode).includes(error.code as MboxErrorCode)
    ) {
      errorCode = error.code as MboxErrorCode;
    }

    const errorMessage = this.getTranslatedErrorMessage(errorCode);
    const requirePinClear = this.shouldClearPinCode(errorCode);

    const result = {
      code: errorCode,
      message: errorMessage,
      requirePinClear: requirePinClear,
      originalError: error,
      context: context,
    };

    this.logError(result);
    return result;
  }

  normalizeApplicationError(error: any, context?: string): any {
    let errorCode = ApplicationErrorCode.UNKNOWN_ERROR as string;
    let errorMessage = '';

    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    if (
      error?.code &&
      Object.values(ApplicationErrorCode).includes(
        error.code as ApplicationErrorCode
      )
    ) {
      errorCode = error.code as ApplicationErrorCode;
    } else if (
      typeof error === 'string' &&
      Object.values(ApplicationErrorCode).includes(
        error as ApplicationErrorCode
      )
    ) {
      errorCode = error as ApplicationErrorCode;
    }

    if (!errorMessage) {
      errorMessage = this.getTranslatedErrorMessage(errorCode);
    }

    const requirePinClear = this.shouldClearPinCode(errorCode);

    const result = {
      code: errorCode,
      message: errorMessage,
      requirePinClear: requirePinClear,
      originalError: error,
      context: context,
    };

    this.logError(result);
    return result;
  }

  toValidationResult(error: any, isMember: boolean = true): ValidationResult {
    const errorConf = this.appConfigService.config.errorHandling;
    return this.createValidationResult(
      false,
      isMember,
      error.message ||
        this.getTranslatedErrorMessage(errorConf.defaultUnknownErrorMessageKey),
      error.code || ApplicationErrorCode.UNKNOWN_ERROR
    );
  }

  getTranslatedErrorMessage(errorCode: string): string {
    const errorKey = `Errors.${errorCode}`;
    const fallbackKey = `Errors.${this.appConfigService.config.errorHandling.defaultUnknownErrorMessageKey}`;

    const translated = this.translate.instant(errorKey);
    if (translated !== errorKey) {
      return translated;
    }
    return this.translate.instant(fallbackKey);
  }

  shouldClearPinCode(errorCode: string): boolean {
    return this.errorCodesToClear.includes(errorCode);
  }

  private logError(error: any): void {
    const context =
      error.context ||
      this.appConfigService.config.errorHandling.contexts[5] ||
      'UNKNOWN_CONTEXT';
    console.error(
      `[${context}] Error (${
        error.code || ApplicationErrorCode.UNKNOWN_ERROR
      }): ${error.message}`,
      error.originalError || ''
    );
  }

  private extractErrorCodeFromHttpResponse(error: HttpErrorResponse): string {
    const errorConf = this.appConfigService.config.errorHandling;
    const httpStatusMapping = errorConf.httpStatusToErrorCode.find(
      (m) => m.status === error.status
    );
    if (httpStatusMapping) {
      return httpStatusMapping.code;
    }

    if (error.error && typeof error.error === 'object' && error.error.code) {
      return error.error.code;
    }
    if (
      error.error &&
      typeof error.error === 'object' &&
      error.error.error &&
      error.error.error.code
    ) {
      return error.error.error.code;
    }
    if (error.error && typeof error.error === 'string') {
      try {
        const parsedError = JSON.parse(error.error);
        if (parsedError.code) {
          return parsedError.code;
        }
        if (parsedError.error && parsedError.error.code) {
          return parsedError.error.code;
        }
      } catch (e) {
        const match = error.error.match(/JOAPI_STIM_\d+/);
        if (match && match[0]) {
          return match[0];
        }
      }
    }
    if (error.message) {
      const match = error.message.match(/JOAPI_STIM_\d+/);
      if (match && match[0]) {
        return match[0];
      }
    }
    return ApplicationErrorCode.UNKNOWN_ERROR;
  }

  handleApiError(error: any): string {
    if (!error.error || !error.error.code) {
      return this.getTranslatedErrorMessage(
        this.appConfigService.config.errorHandling.defaultApiErrorMessageKey
      );
    }
    return this.getTranslatedErrorMessage(error.error.code);
  }
}
