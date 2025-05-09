import { Component, OnInit } from '@angular/core';
import { TranslationService } from './services/translation.service';
import { AppConfigService } from './services/app-config.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'landing-page';

  constructor(
    private translationService: TranslationService,
    private appConfigService: AppConfigService
  ) {
    this.title = this.appConfigService.config.global.appTitle;
  }

  ngOnInit(): void {}
}
