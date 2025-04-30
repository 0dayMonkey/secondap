import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MboxInfoService } from './mbox-info.service';
import { ConfigService } from './config.service';

export interface Promotion {
  id: number;
  code: string;
  title: string;
  reward_type: 'credits' | 'cash';
  reward_value: number;
  promo_type: string;
}

export interface PlayerStatus {
  isCustomer: boolean;
  message: string;
}

export interface PromoResponse {
  data: Promotion[];
  message: string;
}

@Injectable()
export class PromoService {
  constructor(
    private http: HttpClient,
    private mboxService: MboxInfoService,
    private config: ConfigService
  ) {}

  getPlayerPromos(): Observable<PromoResponse> {
    const playerId = this.mboxService.getPlayerId();
    return this.http.get<PromoResponse>(
      this.config.getAPIPlayerPromosUrl(playerId)
    );
  }

  checkPlayerStatus(): Observable<PlayerStatus> {
    const playerId = this.mboxService.getPlayerId();
    return this.http.get<PlayerStatus>(
      this.config.getAPIPlayerStatusUrl(playerId)
    );
  }

  usePromo(promoId: number): Observable<{
    message: string;
  }> {
    return this.http.put<{
      message: string;
    }>(this.config.getAPIPromoUseUrl(promoId), {});
  }

  validatePromoCode(code: string): Observable<{
    valid: boolean;
    message: string;
    promo?: Promotion;
  }> {
    const playerId = this.mboxService.getPlayerId();
    return this.http.post<{
      valid: boolean;
      message: string;
      promo?: Promotion;
    }>(this.config.getAPIPromoValidateUrl(), {
      code,
      playerId,
    });
  }
}
