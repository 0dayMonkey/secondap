import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, interval } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from './config.service';
import { MboxInfoService } from './mbox-info.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService implements OnDestroy {
  private notificationsSubject = new BehaviorSubject<number>(0);
  public notifications$ = this.notificationsSubject.asObservable();

  private refreshInterval: Subscription;

  constructor(
    private http: HttpClient,
    private config: ConfigService,
    private mboxInfoService: MboxInfoService
  ) {
    this.refreshInterval = interval(10000).subscribe(() => {
      this.fetchPromotionCount();
    });

    this.fetchPromotionCount();

    this.mboxInfoService.mboxData$.subscribe(() => {
      this.fetchPromotionCount();
    });
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
    }
  }

  private fetchPromotionCount(): void {
    const playerId = this.mboxInfoService.getPlayerId();

    if (!playerId) {
      this.notificationsSubject.next(0);
      return;
    }

    this.http
      .get<any>(`${this.config.apiBaseUrl}/player/${playerId}/promos`)
      .subscribe({
        next: (response) => {
          const promoCount = response.data ? response.data.length : 0;
          this.notificationsSubject.next(promoCount);
          console.log(`Promotions récupérées: ${promoCount}`);
        },
        error: (error) => {
          console.error(
            'Erreur lors de la récupération des promotions:',
            error
          );
          this.notificationsSubject.next(0);
        },
      });
  }

  public clearNotifications(): void {
    this.notificationsSubject.next(0);
    console.log('Notifications réinitialisées');
  }
}
