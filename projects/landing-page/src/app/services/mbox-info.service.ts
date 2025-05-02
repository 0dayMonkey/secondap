import { Injectable } from '@angular/core';
import { MboxData, MboxInfo } from '../models/models';
import { BehaviorSubject, Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ConfigService } from './config.service';

@Injectable()
export class MboxInfoService {
  public mboxDataObject: MboxData = {
    ownerId: '111111',
    // ownerId: 'YOHANN',
    // ownerId: '0',

    // twoLetterISOLanguageName: 'bg',
    twoLetterISOLanguageName: 'fr',
    // twoLetterISOLanguageName: 'zh',
    // twoLetterISOLanguageNamek: 'es',
    // twoLetterISOLanguageName: 'it',

    casinoCurrencySymbol: '€',
    // casinoCurrencySymbol: 'USD',
    // casinoCurrencySymbol: 'JPY',
    // casinoCurrencySymbol: '$',
    // casinoCurrencySymbol: 'EUR',

    egmCode: '123456',
    casinoId: '1',
  };

  private mboxDataSubject = new BehaviorSubject<MboxData>(this.mboxDataObject);
  public mboxData$: Observable<MboxData> = this.mboxDataSubject.asObservable();

  constructor(
    private translateService: TranslateService,
    private config: ConfigService
  ) {}

  updateMboxData(data: Partial<MboxData>): void {
    this.mboxDataObject = {
      ...this.mboxDataObject,
      ...data,
    };
    this.mboxDataSubject.next(this.mboxDataObject);
    this.updateLanguage();
  }

  setMboxData(data: MboxData): void {
    this.mboxDataObject = data;
    this.mboxDataSubject.next(this.mboxDataObject);
    this.updateLanguage();
  }

  private updateLanguage(): void {
    const lang =
      this.mboxDataObject.twoLetterISOLanguageName?.toLowerCase() ||
      this.config.defaultLanguage;

    if (this.config.supportedLanguages.includes(lang)) {
      this.translateService.use(lang);
    } else {
      this.translateService.use(this.config.defaultLanguage);
    }
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
      this.config.defaultCurrencySymbol
    );
  }

  getLanguage(): string {
    return this.mboxDataObject.twoLetterISOLanguageName;
  }

  private receiveMessage(event: MessageEvent<MboxInfo>) {
    if (event.data.messageType === 'mbox-data') {
      this.updateMboxData(event.data);
    }
  }
}
