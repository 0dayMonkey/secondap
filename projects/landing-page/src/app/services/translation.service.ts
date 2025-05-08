import { Injectable } from '@angular/core';
import {
  TranslateService,
  LangChangeEvent,
  TranslationChangeEvent,
} from '@ngx-translate/core'; // Importez les événements
import { MboxInfoService } from '../../../../common/services/mbox-info.service';
import { ConfigService } from 'projects/common/services/config.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs'; // Importez BehaviorSubject et Observable
import { filter } from 'rxjs/operators'; // Importez filter

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private mboxSub: Subscription; // Gardez une référence pour se désabonner
  private langChangeSub: Subscription; // Pour les changements de langue effectifs
  private translationsLoaded = new BehaviorSubject<boolean>(false);
  public translationsLoaded$: Observable<boolean> =
    this.translationsLoaded.asObservable();

  constructor(
    private translateService: TranslateService,
    private mboxInfoService: MboxInfoService,
    private config: ConfigService
  ) {
    // Gérer le chargement initial
    this.translateService.setDefaultLang(this.config.defaultLanguage);
    const initialLang = (
      this.mboxInfoService.getLanguage() || this.config.defaultLanguage
    ).toLowerCase();
    this.updateLanguage(initialLang, true); // true pour indiquer le chargement initial

    // S'abonner aux changements de langue futurs venant de Mbox
    this.mboxSub = this.mboxInfoService.mboxData$
      .pipe(
        filter((data) => !!data.twoLetterISOLanguageName) // S'assurer que la langue est définie
      )
      .subscribe((data) => {
        this.updateLanguage(data.twoLetterISOLanguageName);
      });

    // S'abonner à l'événement de chargement des traductions de ngx-translate
    this.langChangeSub = this.translateService.onTranslationChange.subscribe(
      () => {
        this.translationsLoaded.next(true);
        console.log(
          'Translations successfully loaded for language:',
          this.translateService.currentLang
        );
      }
    );
  }

  updateLanguage(lang?: string, isInitialLoad: boolean = false): void {
    this.translationsLoaded.next(false); // Mettre à false avant de charger une nouvelle langue
    const languageToUse = (
      lang ||
      this.mboxInfoService.getLanguage() ||
      this.config.defaultLanguage
    ).toLowerCase();

    let effectiveLang = this.config.defaultLanguage;
    if (this.config.supportedLanguages.includes(languageToUse)) {
      effectiveLang = languageToUse;
    }

    console.log(`Attempting to load language: ${effectiveLang}`);
    this.translateService.use(effectiveLang).subscribe({
      next: () => {
        // Le onTranslationChange devrait maintenant se déclencher
        // si ce n'est pas déjà fait, ou si la langue changeait effectivement.
        // Parfois, .use() peut résoudre avant que onTranslationChange ne se déclenche si les traductions sont déjà en cache
        // Pour être sûr, on peut mettre translationsLoaded à true ici aussi, mais onTranslationChange est plus fiable
        // pour le moment où les fichiers de traduction sont réellement traités.
        // this.translationsLoaded.next(true); // Déplacé vers onTranslationChange
      },
      error: (err) => {
        console.error(`Error loading language ${effectiveLang}:`, err);
        // En cas d'erreur de chargement, on revient à la langue par défaut
        if (effectiveLang !== this.config.defaultLanguage) {
          console.warn(
            `Falling back to default language: ${this.config.defaultLanguage}`
          );
          this.translateService
            .use(this.config.defaultLanguage)
            .subscribe(() => {
              // this.translationsLoaded.next(true); // Déplacé vers onTranslationChange
            });
        } else {
          this.translationsLoaded.next(true); // Si même la langue par défaut échoue, on considère quand même chargé pour éviter un blocage.
        }
      },
    });
  }

  // ngOnDestroy() { // Si ce service peut être détruit, désabonnez-vous
  //   if (this.mboxSub) {
  //     this.mboxSub.unsubscribe();
  //   }
  //   if (this.langChangeSub) {
  //     this.langChangeSub.unsubscribe();
  //   }
  // }
}
