const LOCAL_CREDITS_KEY = 'geovision_local_credits_balance';
const DEFAULT_CREDITS = 30;

const TEMP_BUNDLES: CreditBundle[] = [
  { id: 'plus_1000', credits: 1000, price_inr: 999, label: '1000 Credits' },
  { id: 'plus_10000', credits: 10000, price_inr: 7999, label: '10000 Credits' },
  { id: 'plus_100000', credits: 100000, price_inr: 59999, label: '100000 Credits' },
];

export interface CreditBundle {
  id: string;
  credits: number;
  price_inr: number;
  label: string;
}

export interface InsufficientCreditDetail {
  remaining_credits: number;
  required_credits: number;
  model: string;
}

class CreditsService {
  private readBalance(): number {
    const raw = localStorage.getItem(LOCAL_CREDITS_KEY);
    if (!raw) return DEFAULT_CREDITS;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_CREDITS;
  }

  private writeBalance(value: number): void {
    const safe = Math.max(0, Math.floor(value));
    localStorage.setItem(LOCAL_CREDITS_KEY, String(safe));
  }

  async getBalance(): Promise<number> {
    return this.readBalance();
  }

  async getBundles(): Promise<CreditBundle[]> {
    return TEMP_BUNDLES;
  }

  async purchase(bundleId: string): Promise<{ remaining_credits: number } | null> {
    const bundle = TEMP_BUNDLES.find((b) => b.id === bundleId);
    if (!bundle) {
      throw new Error('Invalid credit package selected');
    }

    const current = this.readBalance();
    const next = current + bundle.credits;
    this.writeBalance(next);

    return {
      remaining_credits: next,
    };
  }

  async consume(amount: number): Promise<number> {
    const current = this.readBalance();
    const next = Math.max(0, current - Math.max(0, Math.floor(amount)));
    this.writeBalance(next);
    return next;
  }

  async resetToDefault(): Promise<number> {
    this.writeBalance(DEFAULT_CREDITS);
    return DEFAULT_CREDITS;
  }
}

export const creditsService = new CreditsService();
