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
import { AppConfigService } from '../../landing-page/src/app/services/app-config.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(
    private http: HttpClient,
    private mboxService: MboxInfoService,
    private configService: ConfigService,
    private appConfigService: AppConfigService
  ) {}

  private getDeepValue(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  getPlayerPromos(): Observable<PromoResponse> {
    const playerId = this.mboxService.getPlayerId();
    return this.http
      .get<Stim[]>(this.configService.getAPIPlayerPromosUrl(playerId))
      .pipe(
        map((stims) => this.mapStimsToPromotions(stims)),
        catchError((error: HttpErrorResponse) => {
          return throwError(() => error);
        })
      );
  }

  private mapStimsToPromotions(stims: Stim[]): PromoResponse {
    const mapping = this.appConfigService.config.apiMapping.stimToPromotion;
    const promoConfig = this.appConfigService.config.apiMapping.promo;

    const promotions = stims
      .filter((stim) => stim.statut === promoConfig.statusToDo)
      .map((stim) => {
        const reward_type: 'Point' | 'Montant' =
          this.getDeepValue(stim, mapping.rewardTypeField) ===
          promoConfig.rewardTypePoint
            ? (promoConfig.rewardTypePoint as 'Point')
            : (promoConfig.rewardTypeAmount as 'Montant');

        let title = promoConfig.defaultTitle;
        for (const field of mapping.titleFields) {
          const val = this.getDeepValue(stim, field);
          if (val) {
            title = val;
            break;
          }
        }

        return {
          id: this.getDeepValue(stim, mapping.idField),
          code: String(this.getDeepValue(stim, mapping.codeField)),
          title: title,
          reward_type: reward_type,
          reward_value: this.getDeepValue(stim, mapping.rewardValueField),
          promo_type: this.getDeepValue(stim, mapping.promoTypeField),
          utilisation: {
            effectuees: this.getDeepValue(stim, mapping.usageEffectueesField),
            maximum: this.getDeepValue(stim, mapping.usageMaximumField),
            restantes: this.getDeepValue(stim, mapping.usageRestantesField),
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
    return this.http
      .get<PlayerStatus>(this.configService.getAPIPlayerStatusUrl(playerId))
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => error);
        })
      );
  }

  usePromo(promoId: number): Observable<{
    message: string;
  }> {
    return this.http
      .put<{
        message: string;
      }>(this.configService.getAPIPromoUseUrl(promoId), {})
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => error);
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
      }>(this.configService.getAPIPromoValidateUrl(), {
        code,
        playerId,
      })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => error);
        })
      );
  }
}
