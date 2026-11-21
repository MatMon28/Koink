import { Baby, Banknote, Beer, Book, Briefcase, Bus, Car, Coffee, Coins, CreditCard, Dumbbell, Film, Fuel, Gamepad2, Gift, GraduationCap, Heart, House, Landmark, Music, PawPrint, Pizza, Plane, Scissors, Shirt, ShoppingBag, Smartphone, Sparkles, Tag, Wallet, Wifi, Wrench, type LucideIcon } from 'lucide-react';
import { PigIcon } from './pig';

/**
 * The icons a user can give their own categories and accounts. The key is what is stored in the
 * journal, so never rename one: add new ones at the end.
 */
export const ICON_CHOICES: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'tag', label: 'Tag', icon: Tag },
  { key: 'house', label: 'Home', icon: House },
  { key: 'car', label: 'Car', icon: Car },
  { key: 'bus', label: 'Transit', icon: Bus },
  { key: 'fuel', label: 'Fuel', icon: Fuel },
  { key: 'plane', label: 'Travel', icon: Plane },
  { key: 'coffee', label: 'Coffee', icon: Coffee },
  { key: 'pizza', label: 'Food', icon: Pizza },
  { key: 'beer', label: 'Drinks', icon: Beer },
  { key: 'gamepad', label: 'Games', icon: Gamepad2 },
  { key: 'film', label: 'Movies', icon: Film },
  { key: 'music', label: 'Music', icon: Music },
  { key: 'book', label: 'Books', icon: Book },
  { key: 'school', label: 'School', icon: GraduationCap },
  { key: 'dumbbell', label: 'Sport', icon: Dumbbell },
  { key: 'shirt', label: 'Clothes', icon: Shirt },
  { key: 'bag', label: 'Shopping', icon: ShoppingBag },
  { key: 'gift', label: 'Gifts', icon: Gift },
  { key: 'paw', label: 'Pets', icon: PawPrint },
  { key: 'baby', label: 'Kids', icon: Baby },
  { key: 'wrench', label: 'Repairs', icon: Wrench },
  { key: 'phone', label: 'Phone', icon: Smartphone },
  { key: 'wifi', label: 'Internet', icon: Wifi },
  { key: 'heart', label: 'Care', icon: Heart },
  { key: 'scissors', label: 'Beauty', icon: Scissors },
  { key: 'sparkles', label: 'Treats', icon: Sparkles },
  { key: 'wallet', label: 'Wallet', icon: Wallet },
  { key: 'card', label: 'Card', icon: CreditCard },
  { key: 'bank', label: 'Bank', icon: Landmark },
  { key: 'cash', label: 'Cash', icon: Banknote },
  { key: 'coins', label: 'Coins', icon: Coins },
  { key: 'piggy', label: 'Piggy bank', icon: PigIcon },
  { key: 'briefcase', label: 'Work', icon: Briefcase },
];

const byKey = new Map(ICON_CHOICES.map((choice) => [choice.key, choice.icon]));

export const iconFor = (key: string | undefined, fallback: LucideIcon = Tag): LucideIcon => (key ? byKey.get(key) : undefined) ?? fallback;
