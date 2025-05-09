import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, ReplaySubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AppConfig } from '../models/app-config.model';

@Injectable({
  providedIn: 'root',
})
export class AppConfigService {
  private appConfigSettings: AppConfig | undefined;
  private configLoaded = new ReplaySubject<AppConfig>(1); // ReplaySubject pour les souscripteurs tardifs

  constructor(private http: HttpClient) {}

  loadAppConfig(): Observable<AppConfig> {
    const configFile = '../assets/config.json';
    return this.http.get<AppConfig>(configFile).pipe(
      tap((data: AppConfig) => {
        this.appConfigSettings = data;
        this.configLoaded.next(data);
        this.configLoaded.complete(); // Compléter après la première émission
      }),
      catchError((error) => {
        console.error('CRITICAL: Failed to load app configuration.', error);
        this.configLoaded.error(error); // Propager l'erreur aux souscripteurs
        return throwError(() => new Error('Failed to load app configuration.'));
      })
    );
  }

  get config(): AppConfig {
    if (!this.appConfigSettings) {
      throw new Error(
        'CRITICAL: Configuration has not been loaded or failed to load. Ensure APP_INITIALIZER is set up correctly and config.json is accessible.'
      );
    }
    return this.appConfigSettings;
  }

  // Utile pour les dépendances qui ont besoin de la config après son chargement
  get config$(): Observable<AppConfig> {
    return this.configLoaded.asObservable();
  }

  // À utiliser avec EXTRÊME prudence, uniquement si vous êtes certain que la config est chargée
  // Typiquement après la résolution de APP_INITIALIZER
  public getResolvedConfig(): AppConfig | undefined {
    return this.appConfigSettings;
  }
}
