import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ConfigService } from './config.service';
import { MboxInfoService } from './mbox-info.service';
import {
  PlayerStatus,
  PromoResponse,
  Promotion,
  Stim,
} from '../models/common.models';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(
    private http: HttpClient,
    private mboxService: MboxInfoService,
    private config: ConfigService
  ) {}

  getPlayerPromos(): Observable<PromoResponse> {
    const playerId = this.mboxService.getPlayerId();
    return this.http
      .get<Stim[]>(this.config.getAPIPlayerPromosUrl(playerId))
      .pipe(
        map((stims) => this.mapStimsToPromotions(stims)),
        catchError((error: HttpErrorResponse) => {
          console.error(
            'Erreur lors de la récupération des promotions:',
            error
          );
          return throwError(() => ({
            error: {
              code: this.getErrorCodeFromResponse(error),
              message:
                error.message ||
                'Erreur lors de la récupération des promotions',
            },
          }));
        })
      );
  }

  private mapStimsToPromotions(stims: Stim[]): PromoResponse {
    const promotions = stims
      .filter((stim) => stim.statut === 'To Do')
      .map((stim) => {
        const reward_type: 'Point' | 'Montant' =
          stim.typePromo === 'Point' ? 'Point' : 'Montant';

        return {
          id: stim.identifiantStim,
          code: stim.identifiantStim.toString(),
          title: stim.sujet || stim.commentaire || 'Promotion sans titre',
          reward_type: reward_type,
          reward_value: stim.valeurPromo,
          promo_type: stim.type,
          utilisation: {
            effectuees: stim.utilisation.effectuees,
            maximum: stim.utilisation.maximum,
            restantes: stim.utilisation.restantes,
          },
        };
      });

    return {
      data: promotions,
      message: '',
    };
  }

  checkPlayerStatus(): Observable<PlayerStatus> {
    const playerId = this.mboxService.getPlayerId();
    //toujours un client, simulation pour l'instant
    return this.http
      .get<PlayerStatus>(this.config.getAPIPlayerStatusUrl(playerId))
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error(
            'Erreur lors de la vérification du statut du joueur:',
            error
          );
          return throwError(() => ({
            error: {
              code: this.getErrorCodeFromResponse(error),
              message:
                error.message ||
                'Erreur lors de la vérification du statut du joueur',
            },
          }));
        })
      );
  }

  usePromo(promoId: number): Observable<{
    message: string;
  }> {
    return this.http
      .put<{
        message: string;
      }>(this.config.getAPIPromoUseUrl(promoId), {})
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error("Erreur lors de l'utilisation de la promotion:", error);
          return throwError(() => ({
            error: {
              code: this.getErrorCodeFromResponse(error),
              message:
                error.message || "Erreur lors de l'utilisation de la promotion",
            },
          }));
        })
      );
  }

  validatePromoCode(code: string): Observable<{
    valid: boolean;
    message: string;
    promo?: Promotion;
  }> {
    const playerId = this.mboxService.getPlayerId();
    return this.http
      .post<{
        valid: boolean;
        message: string;
        promo?: Promotion;
      }>(this.config.getAPIPromoValidateUrl(), {
        code,
        playerId,
      })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Erreur lors de la validation du code promo:', error);
          return throwError(() => ({
            error: {
              code: this.getErrorCodeFromResponse(error),
              message:
                error.message || 'Erreur lors de la validation du code promo',
            },
          }));
        })
      );
  }

  private getErrorCodeFromResponse(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'API_COMMUNICATION_ERROR';
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
        if (match) {
          return match[0];
        }
      }
    }

    if (error.message) {
      const match = error.message.match(/JOAPI_STIM_\d+/);
      if (match) {
        return match[0];
      }
    }

    console.warn("Code d'erreur non identifié:", error);

    return 'UNKNOWN_ERROR';
  }
}
