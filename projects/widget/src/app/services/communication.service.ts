import { Injectable } from '@angular/core';
import { MboxInfoService } from './mbox-info.service';

@Injectable({
  providedIn: 'root',
})
export class CommunicationService {
  constructor(private mboxInfoService: MboxInfoService) {}

  sendMessageToParent(type: string, data: any): void {
    try {
      const playerId = this.mboxInfoService.getPlayerId();
      window.parent.postMessage(
        {
          messageType: type,
          ownerId: playerId,
          data: data,
        },
        '*'
      );
      console.log(`Message envoyé au parent: ${type}`, data);
    } catch (error) {
      console.error("Erreur lors de l'envoi du message au parent:", error);
    }
  }

  navigateToLandingPage(): void {
    try {
      window.parent.postMessage(
        {
          messageType: 'navigate',
          url: 'landing-page',
          ownerId: this.mboxInfoService.getPlayerId(),
        },
        '*'
      );
      console.log('Navigation vers landing-page demandée');
    } catch (error) {
      console.error('Erreur lors de la demande de navigation:', error);
    }
  }
}
