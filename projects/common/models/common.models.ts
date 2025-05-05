export interface MboxData {
  ownerId: string;
  twoLetterISOLanguageName: string;
  casinoCurrencySymbol: string;
  egmCode: string;
  casinoId: string;
}

export interface MboxInfo extends MboxData {
  messageType: 'mbox-data';
}

export interface Promotion {
  id: number;
  code: string;
  title: string;
  reward_type: 'credits' | 'cash';
  reward_value: number;
  promo_type: string;
}

export interface PlayerStatus {
  isCustomer: boolean;
  message: string;
}

export interface PromoResponse {
  data: Promotion[];
  message: string;
}

export interface WidgetMessage {
  messageType: string;
  data: any;
}
