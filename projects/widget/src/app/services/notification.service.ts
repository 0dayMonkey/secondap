import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from 'projects/common/services/config.service';
import { MboxInfoService } from 'projects/common/services/mbox-info.service';
import { ApiService } from 'projects/common/services/api.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService implements OnDestroy {
  private notificationsSubject = new BehaviorSubject<number>(0);
  public notifications$ = this.notificationsSubject.asObservable();

  private mboxSubscription: Subscription;

  constructor(
    private http: HttpClient,
    private config: ConfigService,
    private mboxInfoService: MboxInfoService,
    private apiService: ApiService
  ) {
    this.fetchPromotionCount();

    this.mboxSubscription = this.mboxInfoService.mboxData$.subscribe(() => {
      this.fetchPromotionCount();
    });
  }

  ngOnDestroy(): void {
    if (this.mboxSubscription) {
      this.mboxSubscription.unsubscribe();
    }
  }

  private fetchPromotionCount(): void {
    const playerId = this.mboxInfoService.getPlayerId();

    if (!playerId) {
      this.notificationsSubject.next(0);
      return;
    }

    this.apiService.getPlayerPromos().subscribe({
      next: (response) => {
        const promoCount = response.data ? response.data.length : 0;
        this.notificationsSubject.next(promoCount);
        console.log(`Promotions récupérées: ${promoCount}`);
      },
      error: (error) => {
        console.error('Erreur lors de la récupération des promotions:', error);
        this.notificationsSubject.next(0);
      },
    });
  }

  public refreshPromotions(): void {
    this.fetchPromotionCount();
  }

  public clearNotifications(): void {
    this.notificationsSubject.next(0);
    console.log('Notifications réinitialisées');
  }
}
