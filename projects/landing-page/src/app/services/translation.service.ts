import { Injectable, OnDestroy } from '@angular/core';
import {
  TranslateService,
  LangChangeEvent,
  TranslationChangeEvent,
} from '@ngx-translate/core';
import { MboxInfoService } from '../../../../common/services/mbox-info.service';
import { ConfigService } from 'projects/common/services/config.service';
import { BehaviorSubject, Observable, Subscription, of } from 'rxjs';
import { catchError, filter, take, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class TranslationService implements OnDestroy {
  private mboxSub: Subscription;
  private langChangeSub: Subscription;
  private translationChangeSub: Subscription;
  private readonly translationsLoaded = new BehaviorSubject<boolean>(false);
  public readonly translationsLoaded$: Observable<boolean> =
    this.translationsLoaded.asObservable();

  constructor(
    private translateService: TranslateService,
    private mboxInfoService: MboxInfoService,
    private config: ConfigService
  ) {
    this.translateService.setDefaultLang(this.config.defaultLanguage);

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
  }

  public updateLanguage(lang?: string): void {
    this.translationsLoaded.next(false);
    const languageToUse = (
      lang ||
      this.mboxInfoService.getLanguage() ||
      this.config.defaultLanguage
    ).toLowerCase();

    let effectiveLang = this.config.defaultLanguage;
    if (this.config.supportedLanguages.includes(languageToUse)) {
      effectiveLang = languageToUse;
    }

    this.translateService
      .use(effectiveLang)
      .pipe(
        take(1),
        tap(() => {
          const currentTranslations =
            this.translateService.translations[
              this.translateService.currentLang
            ];
          if (
            currentTranslations &&
            Object.keys(currentTranslations).length > 0
          ) {
            if (!this.translationsLoaded.value) {
              this.translationsLoaded.next(true);
            }
          }
        }),
        catchError((error) => {
          if (effectiveLang !== this.config.defaultLanguage) {
            return this.translateService.use(this.config.defaultLanguage).pipe(
              take(1),
              tap(() => {
                const currentTranslationsFallback =
                  this.translateService.translations[
                    this.translateService.currentLang
                  ];
                if (
                  currentTranslationsFallback &&
                  Object.keys(currentTranslationsFallback).length > 0
                ) {
                  if (!this.translationsLoaded.value) {
                    this.translationsLoaded.next(true);
                  }
                } else {
                  this.translationsLoaded.next(true);
                }
              }),
              catchError((fallbackError) => {
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
