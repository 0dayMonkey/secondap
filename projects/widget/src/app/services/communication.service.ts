import { Injectable } from '@angular/core';
import { MboxInfoService } from 'projects/common/services/mbox-info.service';

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
      console.log(`msg op: ${type}`, data);
    } catch (error) {
      console.error('msg nop:', error);
    }
  }

  navigateToLandingPage(): void {
    try {
      window.parent.postMessage(
        {
          messageType: 'navigate',
          url: 'landing-page',
          ownerId: this.mboxInfoService.getPlayerId(),
          // appName: name,
        },
        '*'
      );
      console.log('navigation op');
    } catch (error) {
      console.error('navigation nop:', error);
    }
  }
}

/*
window.parent.postMessage({
                messageType: "navigate",
                url: url,
                appName: name,
            }, '*')

            */
