export const CATEGORIES = [
  { id: 'food', label: '餐饮', icon: 'UtensilsCrossed' },
  { id: 'transport', label: '交通', icon: 'Car' },
  { id: 'hotel', label: '住宿', icon: 'Building2' },
  { id: 'shopping', label: '购物', icon: 'ShoppingBag' },
  { id: 'entertainment', label: '娱乐', icon: 'Gamepad2' },
  { id: 'ticket', label: '票务', icon: 'Ticket' },
  { id: 'office', label: '办公', icon: 'Briefcase' },
  { id: 'other', label: '其他', icon: 'MoreHorizontal' },
] as const;

export const PAYMENT_METHODS = [
  { id: 'wechat', label: '微信支付' },
  { id: 'alipay', label: '支付宝' },
  { id: 'huabei', label: '花呗' },
  { id: 'credit_card', label: '信用卡' },
  { id: 'debit_card', label: '储蓄卡' },
  { id: 'cash', label: '现金' },
  { id: 'apple_pay', label: 'Apple Pay' },
  { id: 'other', label: '其他' },
] as const;

export function getPaymentMethodLabel(id: string): string {
  return PAYMENT_METHODS.find(p => p.id === id)?.label ?? '其他';
}

export const CURRENCIES = [
  { code: 'CNY', symbol: '¥', name: '人民币' },
  { code: 'USD', symbol: '$', name: '美元' },
  { code: 'EUR', symbol: '€', name: '欧元' },
  { code: 'JPY', symbol: '¥', name: '日元' },
  { code: 'GBP', symbol: '£', name: '英镑' },
  { code: 'KRW', symbol: '₩', name: '韩元' },
  { code: 'HKD', symbol: 'HK$', name: '港币' },
  { code: 'THB', symbol: '฿', name: '泰铢' },
] as const;

export function getCategoryLabel(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.label ?? '其他';
}

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find(c => c.code === code)?.symbol ?? '¥';
}
