import { NgModule, APP_INITIALIZER, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import {
  HttpClientModule,
  HttpClient,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  TranslateModule,
  TranslateLoader,
  TranslateService,
} from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ButtonModule } from 'primeng/button';

import { AppComponent } from './app.component';
import { PromoListComponent } from './components/promo-list/promo-list.component';
import { PinCodeComponent } from './components/pin-code/pin-code.component';
import { ConfirmationComponent } from './components/confirmation/confirmation.component';
import { TestComponent } from './components/test/test.component';
import { routes } from './app.routes';

import { PromoService } from './services/promo.service';
import { FormattingService } from './services/formatting.service';
import { AnimationService } from './services/animation.service';
import { PinCodeService } from './services/pin-code.service';
import { PromoValidationService } from './services/promo-validation.service';
import { TranslationService } from './services/translation.service';
import { ErrorHandlingService } from './services/error-handler.service';
import { HttpErrorInterceptor } from './services/http-error.interceptor';
import { MatIconModule } from '@angular/material/icon';

import { ConfigService } from '../../../common/services/config.service';
import { MboxInfoService } from '../../../common/services/mbox-info.service';
import { ApiService } from '../../../common/services/api.service';
import { Observable, of, lastValueFrom } from 'rxjs';
import { delay, filter, take, switchMap, tap, map } from 'rxjs/operators';

import { AppConfigService } from './services/app-config.service';
// AppConfig sera utilisé implicitement via AppConfigService

export class CustomTranslateHttpLoader extends TranslateHttpLoader {
  // appConfigService est injecté mais stocké pour être utilisé dans getTranslation
  constructor(
    public httpClient: HttpClient, // HttpClient est public dans TranslateHttpLoader, pas besoin d'override ici.
    // Le nom du paramètre doit correspondre pour que l'injection fonctionne bien avec super.
    private appConfigService: AppConfigService
  ) {
    // Appeler super() avec des valeurs par défaut ou génériques.
    // La logique dynamique se trouvera dans getTranslation.
    super(httpClient, './assets/i18n/', '.json');
  }

  public override getTranslation(lang: string): Observable<any> {
    let basePath = './assets/i18n/'; // Valeur par défaut
    let suffix = '.json'; // Valeur par défaut
    let simulatedDelay = 0; // Valeur par défaut

    try {
      // À ce stade, APP_INITIALIZER devrait avoir chargé la configuration.
      const config = this.appConfigService.config;
      basePath = config.localization.translationFiles.basePath;
      suffix = config.localization.translationFiles.fileSuffix;
      simulatedDelay = config.animations.translationLoadDelaySimulated;
    } catch (e) {
      console.warn(
        "CustomTranslateHttpLoader: La configuration n'était pas prête au moment de getTranslation. Utilisation des chemins par défaut.",
        e
      );
    }

    // Utiliser this.httpClient qui est hérité et correctement initialisé par la classe de base.
    const translationObs = this.httpClient.get(`${basePath}${lang}${suffix}`);

    if (simulatedDelay > 0) {
      return translationObs.pipe(delay(simulatedDelay));
    }
    return translationObs;
  }
}

export function HttpLoaderFactory(
  http: HttpClient,
  appConfigService: AppConfigService
) {
  return new CustomTranslateHttpLoader(http, appConfigService);
}

export function initializeAppFactory(
  appConfigService: AppConfigService,
  translateService: TranslateService,
  mboxInfoService: MboxInfoService
): () => Promise<any> {
  return () =>
    lastValueFrom(
      appConfigService.loadAppConfig().pipe(
        switchMap((config) => {
          translateService.setDefaultLang(config.localization.defaultLanguage);

          let langToLoad =
            mboxInfoService.getLanguage() ||
            config.localization.defaultLanguage;
          langToLoad = langToLoad.toLowerCase();
          if (!config.localization.supportedLanguages.includes(langToLoad)) {
            langToLoad = config.localization.defaultLanguage;
          }
          return translateService.use(langToLoad).pipe(map(() => config));
        }),
        tap((config) => {
          // MboxInfoService injecte déjà AppConfigService, son constructeur aura la config.
        }),
        map(() => true)
      )
    );
}

@NgModule({
  declarations: [
    AppComponent,
    PromoListComponent,
    PinCodeComponent,
    ConfirmationComponent,
    TestComponent,
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot(routes),
    HttpClientModule,
    FormsModule,
    CommonModule,
    MatIconModule,
    ButtonModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient, AppConfigService],
      },
    }),
  ],
  providers: [
    AppConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAppFactory,
      deps: [AppConfigService, TranslateService, MboxInfoService],
      multi: true,
    },
    PromoService,
    MboxInfoService,
    FormattingService,
    AnimationService,
    PinCodeService,
    PromoValidationService,
    ConfigService,
    TranslationService,
    ApiService,
    CurrencyPipe,
    ErrorHandlingService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpErrorInterceptor,
      multi: true,
    },
    {
      provide: LOCALE_ID,
      useFactory: (appConfigService: AppConfigService) => {
        try {
          return appConfigService.config.localization.defaultLocaleId;
        } catch (e) {
          console.warn(
            "LOCALE_ID factory: Config not ready, defaulting to 'en-US'."
          );
          return 'en-US';
        }
      },
      deps: [AppConfigService],
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
