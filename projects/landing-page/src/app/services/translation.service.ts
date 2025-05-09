import { Injectable, OnDestroy } from '@angular/core';
import {
  TranslateService,
  LangChangeEvent,
  TranslationChangeEvent,
} from '@ngx-translate/core';
import { MboxInfoService } from '../../../../common/services/mbox-info.service';
import { AppConfigService } from './app-config.service';
import { AppConfig } from '../models/app-config.model'; // Importation ajoutée
import { BehaviorSubject, Observable, Subscription, of } from 'rxjs';
import { catchError, filter, take, tap, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class TranslationService implements OnDestroy {
  private mboxSub: Subscription | undefined;
  private langChangeSub: Subscription | undefined;
  private translationChangeSub: Subscription | undefined;
  private readonly translationsLoaded = new BehaviorSubject<boolean>(false);
  public readonly translationsLoaded$: Observable<boolean> =
    this.translationsLoaded.asObservable();
  private currentAppConfig: AppConfig;

  constructor(
    private translateService: TranslateService,
    private mboxInfoService: MboxInfoService,
    private appConfigService: AppConfigService
  ) {
    this.currentAppConfig = this.appConfigService.config;

    this.translationChangeSub =
      this.translateService.onTranslationChange.subscribe(
        (event: TranslationChangeEvent) => {
          this.translationsLoaded.next(true);
        }
      );

    this.langChangeSub = this.translateService.onLangChange.subscribe(
      (event: LangChangeEvent) => {
        if (this.translationsLoaded.value) {
          this.translationsLoaded.next(false);
        }
      }
    );

    this.mboxSub = this.mboxInfoService.mboxData$
      .pipe(
        filter(
          (data) =>
            !!data.twoLetterISOLanguageName &&
            data.twoLetterISOLanguageName.toLowerCase() !==
              this.translateService.currentLang?.toLowerCase()
        )
      )
      .subscribe((data) => {
        this.updateLanguage(data.twoLetterISOLanguageName);
      });

    if (
      this.translateService.currentLang &&
      this.translateService.translations[this.translateService.currentLang] &&
      Object.keys(
        this.translateService.translations[this.translateService.currentLang]
      ).length > 0
    ) {
      this.translationsLoaded.next(true);
    } else if (this.translateService.currentLang) {
      // Si currentLang est défini mais pas de traductions, on attend onTranslationChange
      this.translationsLoaded.next(false);
    }
  }

  public updateLanguage(lang?: string): void {
    const configLoc = this.currentAppConfig.localization;
    this.translationsLoaded.next(false);

    const languageToUse = (
      lang ||
      this.mboxInfoService.getLanguage() ||
      configLoc.defaultLanguage
    ).toLowerCase();

    let effectiveLang = configLoc.defaultLanguage;
    if (configLoc.supportedLanguages.includes(languageToUse)) {
      effectiveLang = languageToUse;
    }

    this.translateService
      .use(effectiveLang)
      .pipe(
        take(1),
        catchError((error) => {
          console.warn(
            `Failed to load translations for ${effectiveLang}, falling back to ${configLoc.defaultLanguage}`,
            error
          );
          if (effectiveLang !== configLoc.defaultLanguage) {
            return this.translateService.use(configLoc.defaultLanguage).pipe(
              take(1),
              catchError((fallbackError) => {
                console.error(
                  `Failed to load fallback translations for ${configLoc.defaultLanguage}`,
                  fallbackError
                );
                this.translationsLoaded.next(true);
                return of(null);
              })
            );
          } else {
            this.translationsLoaded.next(true);
            return of(null);
          }
        })
      )
      .subscribe();
  }

  ngOnDestroy() {
    if (this.mboxSub) {
      this.mboxSub.unsubscribe();
    }
    if (this.langChangeSub) {
      this.langChangeSub.unsubscribe();
    }
    if (this.translationChangeSub) {
      this.translationChangeSub.unsubscribe();
    }
  }
}
