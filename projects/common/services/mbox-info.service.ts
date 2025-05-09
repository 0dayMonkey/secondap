import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MboxData } from '../models/common.models';
import { onMboxDataMessage, GetInitialMboxInfo } from 'mbox-opencontent-sdk';
import { AppConfigService } from '../../landing-page/src/app/services/app-config.service';

@Injectable({
  providedIn: 'root',
})
export class MboxInfoService {
  public mboxDataObject: MboxData = {
    ownerId: '',
    twoLetterISOLanguageName: '',
    casinoCurrencySymbol: '',
    egmCode: '',
    casinoId: '',
  };

  private mboxDataSubject = new BehaviorSubject<MboxData>(this.mboxDataObject);
  public mboxData$: Observable<MboxData> = this.mboxDataSubject.asObservable();

  constructor(private appConfigService: AppConfigService) {
    this.initializeMboxData();
  }

  private initializeMboxData(): void {
    const initialMboxInfo = GetInitialMboxInfo();
    const configLoc = this.appConfigService.config.localization;
    const configMboxInitial = this.appConfigService.config.mbox.initialData;

    if (initialMboxInfo) {
      this.setMboxData({
        ownerId: initialMboxInfo.ownerId || configMboxInitial.ownerId,
        twoLetterISOLanguageName:
          initialMboxInfo.twoLetterISOLanguageName || configLoc.defaultLanguage,
        casinoCurrencySymbol:
          initialMboxInfo.casinoCurrencySymbol ||
          configLoc.defaultCurrencySymbol,
        egmCode: initialMboxInfo.egmCode || configMboxInitial.egmCode,
        casinoId: initialMboxInfo.casinoId || configMboxInitial.casinoId,
      });
    } else {
      this.setMboxData({
        ownerId: configMboxInitial.ownerId,
        twoLetterISOLanguageName: configLoc.defaultLanguage,
        casinoCurrencySymbol: configLoc.defaultCurrencySymbol,
        egmCode: configMboxInitial.egmCode,
        casinoId: configMboxInitial.casinoId,
      });
    }

    onMboxDataMessage((data: MboxData) => {
      this.updateMboxData(data);
    });
  }

  updateMboxData(data: Partial<MboxData>): void {
    this.mboxDataObject = {
      ...this.mboxDataObject,
      ...data,
    };
    this.mboxDataSubject.next(this.mboxDataObject);
  }

  setMboxData(data: MboxData): void {
    this.mboxDataObject = data;
    this.mboxDataSubject.next(this.mboxDataObject);
  }

  getPlayerId(): string {
    return this.mboxDataObject.ownerId;
  }

  getCasinoId(): string {
    return this.mboxDataObject.casinoId;
  }

  getEgmCode(): string {
    return this.mboxDataObject.egmCode;
  }

  getCurrencySymbol(): string {
    return (
      this.mboxDataObject.casinoCurrencySymbol ||
      this.appConfigService.config.localization.defaultCurrencySymbol
    );
  }

  getLanguage(): string {
    return this.mboxDataObject.twoLetterISOLanguageName;
  }
}
