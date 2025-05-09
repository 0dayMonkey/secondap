export interface ApiEndpoints {
  playerStatus: string;
  playerPromos: string;
  usePromo: string;
  validatePromo: string;
}

export interface ApiConfig {
  baseUrl: string;
  endpoints: ApiEndpoints;
  requestPlayerPinAppName: string;
  widgetAppName: string;
}

export interface StimToPromotionMapping {
  idField: string;
  codeField: string;
  titleFields: string[];
  rewardTypeField: string;
  rewardValueField: string;
  promoTypeField: string;
  usageEffectueesField: string;
  usageMaximumField: string;
  usageRestantesField: string;
}

export interface ApiMappingConfig {
  promo: {
    statusToDo: string;
    rewardTypePoint: string;
    rewardTypeAmount: string;
    defaultTitle: string;
  };
  stimToPromotion: StimToPromotionMapping;
}

export interface AnimationsConfig {
  itemDelay: number;
  returnItemDelay: number;
  cascadeEndDelay: number;
  viewTransitionDuration: number;
  maxVisibleItemsForCascade: number;
  clickFeedbackDuration: number;
  textFadeInDelay: number;
  textFadeInDuration: number;
  translationLoadDelaySimulated: number;
}

export interface TranslationFilesConfig {
  basePath: string;
  fileSuffix: string;
}

export interface LocalizationConfig {
  supportedLanguages: string[];
  defaultLanguage: string;
  defaultCurrencySymbol: string;
  translationFiles: TranslationFilesConfig;
  defaultLocaleId: string;
  localeMap: { [key: string]: string };
}

export interface PromoCodeValidationConfig {
  pattern: string;
  clearInputOnErrorCodes: string[];
}

export interface ValidationConfig {
  promoCode: PromoCodeValidationConfig;
}

export interface TimeoutsConfig {
  pinAuthentication: number;
  sdkInitialization: number;
}

export interface SimulatedBalanceConfig {
  type: string;
  value: number;
}

export interface PromoConfig {
  hideUsageInfoIfMaxOne: boolean;
  simulatedBalance: SimulatedBalanceConfig;
}

export interface PlayerConfig {
  anonymousPlayerIds: string[];
}

export interface PinPadDefaults {
  clearButtonText: string;
}

export interface ComponentSettings {
  promoList: {
    showLoadingIndicator: boolean;
  };
  confirmationScreen: {
    displayBalanceForPointsOnly: boolean;
  };
  pinCode: {
    autoClearOnMboxError: boolean;
  };
}

export interface UiDefaults {
  pinPad: PinPadDefaults;
  components: ComponentSettings;
}

export interface MboxAuthRedirectConfig {
  baseUrlPattern: string;
  statusParamName: string;
  promoIdParamName: string;
  codeParamName: string;
  rewardTypeParamName: string;
  rewardValueParamName: string;
  successValue: string;
  failureValue: string;
  errorValue: string;
}

export interface MboxInitialDataConfig {
  ownerId: string;
  egmCode: string;
  casinoId: string;
}

export interface MboxConfig {
  authRedirect: MboxAuthRedirectConfig;
  initialData: MboxInitialDataConfig;
}

export interface HttpStatusToErrorCodeMapping {
  status: number;
  code: string;
}

export interface ErrorHandlingConfig {
  defaultApiErrorMessageKey: string;
  defaultUnknownErrorMessageKey: string;
  httpStatusToErrorCode: HttpStatusToErrorCodeMapping[];
  contexts: string[];
}

export interface RoutesConfig {
  defaultRedirectPath: string;
  landingPagePath: string;
}

export interface FeaturesConfig {
  enableManualCodeInput: boolean;
  showPromoUtilisationInfo: boolean;
}

export interface GlobalConfig {
  appName: string;
  appTitle: string;
}

export interface AppConfig {
  global: GlobalConfig;
  api: ApiConfig;
  apiMapping: ApiMappingConfig;
  animations: AnimationsConfig;
  localization: LocalizationConfig;
  validation: ValidationConfig;
  timeouts: TimeoutsConfig;
  promo: PromoConfig;
  player: PlayerConfig;
  uiDefaults: UiDefaults;
  mbox: MboxConfig;
  errorHandling: ErrorHandlingConfig;
  routes: RoutesConfig;
  features: FeaturesConfig;
}
