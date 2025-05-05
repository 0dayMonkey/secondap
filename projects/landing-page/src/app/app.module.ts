import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ButtonModule } from 'primeng/button';

import { AppComponent } from './app.component';
import { PromoListComponent } from './components/promo-list/promo-list.component';
import { PinCodeComponent } from './components/pin-code/pin-code.component';
import { TestComponent } from './components/test/test.component';
import { routes } from './app.routes';

import { PromoService } from './services/promo.service';
import { MboxInfoService } from '../../../common/mbox-info.service';
import { FormattingService } from './services/formatting.service';
import { AnimationService } from './services/animation.service';
import { PinCodeService } from './services/pin-code.service';
import { ConfigService } from './services/config.service';
import { MatIconModule } from '@angular/material/icon';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    PromoListComponent,
    PinCodeComponent,
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
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
  providers: [
    PromoService,
    MboxInfoService,
    FormattingService,
    AnimationService,
    PinCodeService,
    ConfigService,
    CurrencyPipe,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
