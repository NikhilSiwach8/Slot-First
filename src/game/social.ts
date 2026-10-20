// Stake.us (`?social=true`): restricted words are replaced everywhere on screen, as the
// Stake Engine social-mode rules require. A MutationObserver applies the replacements to
// every text node and label the game adds later (rules, banners, marquee, buttons).

const PHRASES: [RegExp, string][] = [
  [/\bplace your bets\b/gi, 'come and play'],
  [/\bat the cost of\b/gi, 'for'],
  [/\bcost of\b/gi, 'can be played for'],
  [/\bbonus buy\b/gi, 'bonus'],
  [/\bbuy bonus\b/gi, 'get bonus'],
  [/\btotal bet\b/gi, 'total play'],
  [/\bpay table\b/gi, 'win table'],
  [/\bpaytable\b/gi, 'win table'],
  [/\bpays out\b/gi, 'wins'],
  [/\bpay out\b/gi, 'win'],
  [/\bpaid out\b/gi, 'won'],
  [/\bloss limit\b/gi, 'stop limit'],
  [/\bbetting\b/gi, 'playing'],
  [/\bbets\b/gi, 'plays'],
  [/\bbet\b/gi, 'play'],
  [/\bbought\b/gi, 'instantly triggered'],
  [/\bbuys\b/gi, 'plays'],
  [/\bbuy\b/gi, 'play'],
  [/\bpurchase\b/gi, 'play'],
  [/\bwager\b/gi, 'play'],
  [/\bgamble\b/gi, 'play'],
  [/\bcash\b/gi, 'coins'],
  [/\bcredits?\b/gi, 'coins'],
  [/\bcurrency\b/gi, 'token'],
  [/\bmoney\b/gi, 'coins'],
  [/\bdeposit\b/gi, 'get coins'],
  [/\bwithdraw\b/gi, 'redeem'],
  [/\bprofit\b/gi, 'net gain'],
  [/\bpaid\b/gi, 'won'],
  [/\bpayer\b/gi, 'winner'],
  [/\bpays\b/gi, 'wins'],
  [/\bpay\b/gi, 'win'],
  [/\bstakes\b/gi, 'play amounts'],
  [/\bstake\b/gi, 'play amount'],
  [/\bcosts?\b/gi, 'play amount'],
];

function keepCase(src: string, out: string): string {
  if (src === src.toUpperCase() && src.length > 1) return out.toUpperCase();
  if (src[0] === src[0].toUpperCase()) return out[0].toUpperCase() + out.slice(1);
  return out;
}

export function socialText(s: string): string {
  let out = s;
  for (const [re, rep] of PHRASES) out = out.replace(re, (m) => keepCase(m, rep));
  return out;
}

function fix(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent ?? '';
    const n = socialText(t);
    if (n !== t) node.textContent = n;
    return;
  }
  if (node instanceof Element) {
    for (const attr of ['aria-label', 'title', 'alt', 'placeholder']) {
      const v = node.getAttribute(attr);
      if (v) {
        const n = socialText(v);
        if (n !== v) node.setAttribute(attr, n);
      }
    }
    node.childNodes.forEach(fix);
  }
}

export function enableSocialMode(root: HTMLElement): void {
  document.title = socialText(document.title);
  fix(root);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') fix(r.target);
      else if (r.type === 'attributes') fix(r.target);
      else r.addedNodes.forEach(fix);
    }
  }).observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'alt'] });
}
