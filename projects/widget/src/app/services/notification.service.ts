import { Injectable } from '@angular/core';
import { BehaviorSubject, interval } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private notifications = new BehaviorSubject<number>(0);
  notifications$ = this.notifications.asObservable();

  constructor() {
    // Simuler l'arrivée de notifications toutes les 5 secondes
    interval(5000).subscribe(() => {
      this.addNotification();
    });
  }

  addNotification() {
    this.notifications.next(this.notifications.value + 1);
    console.log("add")
  }

  clearNotifications() {
    this.notifications.next(0);
  }
}
