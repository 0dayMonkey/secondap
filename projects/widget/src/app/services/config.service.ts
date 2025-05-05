import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  readonly apiBaseUrl: string = 'http://localhost:3000';

  readonly widgetDimensions = {
    width: '120px',
    height: '120px',
  };
}
