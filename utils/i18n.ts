/**
 * i18n.ts — Static JSON loader for all locale namespaces.
 *
 * Structure:
 *   locales/
 *     vi/  common.json | shoulder.json | neck.json | posture.json | wrist.json
 *     en/  common.json | shoulder.json | neck.json | posture.json | wrist.json
 *
 * To add a new namespace:
 *   1. Create locales/{vi,en}/yournamespace.json
 *   2. Import them below and add to the spread in buildMessages()
 */

// ── Vietnamese ────────────────────────────────────────────────────────────────
import viCommon from '../locales/vi/common.json';
import viShoulder from '../locales/vi/shoulder.json';
import viNeck from '../locales/vi/neck.json';
import viPosture from '../locales/vi/posture.json';
import viWrist from '../locales/vi/wrist.json';

// ── English ───────────────────────────────────────────────────────────────────
import enCommon from '../locales/en/common.json';
import enShoulder from '../locales/en/shoulder.json';
import enNeck from '../locales/en/neck.json';
import enPosture from '../locales/en/posture.json';
import enWrist from '../locales/en/wrist.json';

export type Language = 'vi' | 'en';

type Messages = Record<string, string>;

const messages: Record<Language, Messages> = {
  vi: { ...viCommon, ...viShoulder, ...viNeck, ...viPosture, ...viWrist },
  en: { ...enCommon, ...enShoulder, ...enNeck, ...enPosture, ...enWrist },
};

/**
 * Returns a translator function bound to the given language.
 * Supports simple positional interpolation: {0}, {1}, ...
 */
export function buildTranslator(lang: Language) {
  const dict = messages[lang];
  return (key: string, ...args: (string | number)[]): string => {
    let text = dict[key] ?? key;
    args.forEach((arg, i) => {
      text = text.replace(`{${i}}`, String(arg));
    });
    return text;
  };
}

export { messages };
