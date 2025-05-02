import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  readonly apiBaseUrl: string = 'http://localhost:3000/api';

  readonly widgetDimensions = {
    width: '120px',
    height: '120px',
  };

  readonly supportedLanguages: string[] = [
    'fr',
    'en',
    'bg',
    'de',
    'es',
    'it',
    'ja',
    'ko',
    'ru',
    'zh',
  ];
  readonly defaultLanguage: string = 'en';
}
