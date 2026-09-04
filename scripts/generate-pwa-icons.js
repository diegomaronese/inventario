import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const outputDir = path.resolve('public');

// Standard icon SVG (512x512 with rounded squircle, light mode style)
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient (Light Mode) -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#eef2f6"/>
    </linearGradient>

    <!-- Amber Gold Gradients -->
    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>

    <linearGradient id="stripeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#27272a"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>

    <linearGradient id="laserBeam" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0"/>
      <stop offset="25%" stop-color="#f59e0b" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#ef4444" stop-opacity="1"/>
      <stop offset="75%" stop-color="#f59e0b" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </linearGradient>

    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>

    <radialGradient id="ambientGlow" cx="50%" cy="32%" r="65%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.18"/>
      <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>

    <!-- Filter for Glow Effect -->
    <filter id="laserGlow" x="-20%" y="-100%" width="140%" height="300%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Base App Background with Squircle (Light Mode) -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <circle cx="256" cy="200" r="230" fill="url(#ambientGlow)"/>

  <!-- Outer subtle border for light background definition -->
  <rect x="6" y="6" width="500" height="500" rx="108" fill="none" stroke="#e2e8f0" stroke-width="3" opacity="0.85"/>
  <rect x="12" y="12" width="488" height="488" rx="102" fill="none" stroke="url(#amberGrad)" stroke-width="2" opacity="0.35"/>

  <!-- Central Asset Card / Tablet Frame -->
  <g transform="translate(106, 88)">
    <!-- Soft shadow behind card -->
    <rect x="0" y="10" width="300" height="340" rx="36" fill="#0f172a" opacity="0.08"/>

    <!-- Main Card Body (Crisp Light Mode Card) -->
    <rect x="0" y="0" width="300" height="340" rx="36" fill="url(#cardGrad)" stroke="#cbd5e1" stroke-width="2.5"/>

    <!-- Golden Top Accent Banner -->
    <path d="M0 36 C0 16.1 16.1 0 36 0 L264 0 C283.9 0 300 16.1 300 36 L300 68 L0 68 Z" fill="url(#amberGrad)"/>

    <!-- UTFPR Institutional Brand Mark Accent in banner -->
    <text x="150" y="44" fill="#09090b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" letter-spacing="4" text-anchor="middle">UTFPR • PATRIMÔNIO</text>

    <!-- Barcode Container Area (Clean light container) -->
    <rect x="36" y="100" width="228" height="150" rx="20" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/>

    <!-- Barcode Vertical Stripes in high-contrast graphite/black -->
    <g fill="url(#stripeGrad)" transform="translate(56, 118)">
      <rect x="0" y="0" width="10" height="88" rx="3"/>
      <rect x="16" y="0" width="6" height="88" rx="2"/>
      <rect x="28" y="0" width="18" height="88" rx="4"/>
      <rect x="52" y="0" width="8" height="88" rx="3"/>
      <rect x="66" y="0" width="14" height="88" rx="4"/>
      <rect x="86" y="0" width="6" height="88" rx="2"/>
      <rect x="98" y="0" width="22" height="88" rx="4"/>
      <rect x="126" y="0" width="10" height="88" rx="3"/>
      <rect x="142" y="0" width="16" height="88" rx="4"/>
      <rect x="164" y="0" width="8" height="88" rx="3"/>
      <rect x="178" y="0" width="10" height="88" rx="3"/>
    </g>

    <!-- Laser Scanning Beam across barcode -->
    <line x1="24" y1="162" x2="276" y2="162" stroke="url(#laserBeam)" stroke-width="5" filter="url(#laserGlow)" stroke-linecap="round"/>
    <circle cx="150" cy="162" r="4" fill="#ffffff" filter="url(#laserGlow)"/>

    <!-- ID numeric subtitle under barcode -->
    <text x="150" y="232" fill="#64748b" font-family="'Roboto Mono', monospace, sans-serif" font-size="13" font-weight="700" letter-spacing="4" text-anchor="middle">2026 • APUCARANA</text>

    <!-- Lower Status Bar Details -->
    <rect x="36" y="272" width="150" height="18" rx="9" fill="#e2e8f0"/>
    <rect x="36" y="298" width="90" height="12" rx="6" fill="#f1f5f9"/>
  </g>

  <!-- Green & Gold Verification Seal (Bottom-Right Badge) -->
  <g transform="translate(320, 320)">
    <!-- Shadow -->
    <circle cx="56" cy="58" r="50" fill="#0f172a" opacity="0.14"/>
    <!-- Outer Gold Ring -->
    <circle cx="56" cy="56" r="48" fill="url(#amberGrad)"/>
    <!-- Emerald Shield Body -->
    <circle cx="56" cy="56" r="42" fill="#059669"/>
    <circle cx="56" cy="56" r="38" fill="#10b981"/>
    <!-- Checkmark Icon -->
    <path d="M42 56 L52 66 L72 44" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

// Maskable Icon SVG (512x512 full bleed background with safe-zone margin of 15% on all sides)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="mBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#eef2f6"/>
    </linearGradient>

    <linearGradient id="mAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>

    <linearGradient id="mStripeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#27272a"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>

    <linearGradient id="mLaserBeam" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0"/>
      <stop offset="25%" stop-color="#f59e0b" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#ef4444" stop-opacity="1"/>
      <stop offset="75%" stop-color="#f59e0b" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </linearGradient>

    <linearGradient id="mCardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>

    <radialGradient id="mAmbientGlow" cx="50%" cy="32%" r="65%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.18"/>
      <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>

    <filter id="mLaserGlow" x="-20%" y="-100%" width="140%" height="300%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Full-bleed light background for maskable format -->
  <rect width="512" height="512" fill="url(#mBgGrad)"/>
  <circle cx="256" cy="230" r="210" fill="url(#mAmbientGlow)"/>

  <!-- Scaled down to safe-zone (80% diameter) centered around (256, 256) -->
  <g transform="translate(256, 256) scale(0.78) translate(-256, -256)">
    <!-- Central Asset Card / Tablet Frame -->
    <g transform="translate(106, 92)">
      <rect x="0" y="10" width="300" height="336" rx="36" fill="#0f172a" opacity="0.08"/>
      <rect x="0" y="0" width="300" height="336" rx="36" fill="url(#mCardGrad)" stroke="#cbd5e1" stroke-width="2.5"/>

      <!-- Golden Banner -->
      <path d="M0 36 C0 16.1 16.1 0 36 0 L264 0 C283.9 0 300 16.1 300 36 L300 68 L0 68 Z" fill="url(#mAmberGrad)"/>
      <text x="150" y="44" fill="#09090b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" letter-spacing="4" text-anchor="middle">UTFPR • PATRIMÔNIO</text>

      <!-- Barcode Container Area -->
      <rect x="36" y="98" width="228" height="148" rx="20" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/>

      <!-- Barcode Vertical Stripes in high-contrast graphite/black -->
      <g fill="url(#mStripeGrad)" transform="translate(56, 116)">
        <rect x="0" y="0" width="10" height="84" rx="3"/>
        <rect x="16" y="0" width="6" height="84" rx="2"/>
        <rect x="28" y="0" width="18" height="84" rx="4"/>
        <rect x="52" y="0" width="8" height="84" rx="3"/>
        <rect x="66" y="0" width="14" height="84" rx="4"/>
        <rect x="86" y="0" width="6" height="84" rx="2"/>
        <rect x="98" y="0" width="22" height="84" rx="4"/>
        <rect x="126" y="0" width="10" height="84" rx="3"/>
        <rect x="142" y="0" width="16" height="84" rx="4"/>
        <rect x="164" y="0" width="8" height="84" rx="3"/>
        <rect x="178" y="0" width="10" height="84" rx="3"/>
      </g>

      <!-- Laser Scanning Beam -->
      <line x1="24" y1="158" x2="276" y2="158" stroke="url(#mLaserBeam)" stroke-width="5" filter="url(#mLaserGlow)" stroke-linecap="round"/>

      <text x="150" y="228" fill="#64748b" font-family="'Roboto Mono', monospace, sans-serif" font-size="13" font-weight="700" letter-spacing="4" text-anchor="middle">2026 • APUCARANA</text>

      <rect x="36" y="268" width="140" height="18" rx="9" fill="#e2e8f0"/>
      <rect x="36" y="294" width="80" height="12" rx="6" fill="#f1f5f9"/>
    </g>

    <!-- Green & Gold Verification Seal -->
    <g transform="translate(316, 316)">
      <circle cx="56" cy="58" r="48" fill="#0f172a" opacity="0.14"/>
      <circle cx="56" cy="56" r="46" fill="url(#mAmberGrad)"/>
      <circle cx="56" cy="56" r="40" fill="#059669"/>
      <circle cx="56" cy="56" r="36" fill="#10b981"/>
      <path d="M43 56 L53 66 L71 44" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>
</svg>`;

async function main() {
  // 1. Write SVG icons
  fs.writeFileSync(path.join(outputDir, 'icon.svg'), iconSvg, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'icon-maskable.svg'), maskableSvg, 'utf8');
  console.log('Saved SVG icons');

  // 2. Render PNG icons using sharp
  const iconBuffer = Buffer.from(iconSvg);
  const maskableBuffer = Buffer.from(maskableSvg);

  // 192x192 PNG
  await sharp(iconBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(outputDir, 'pwa-192x192.png'));
  console.log('Generated pwa-192x192.png');

  // 512x512 PNG
  await sharp(iconBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, 'pwa-512x512.png'));
  console.log('Generated pwa-512x512.png');

  // Maskable 512x512 PNG
  await sharp(maskableBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, 'pwa-maskable-512x512.png'));
  console.log('Generated pwa-maskable-512x512.png');

  // Apple touch icon 180x180 PNG
  await sharp(iconBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // Also write legacy names for backward compatibility with existing links
  await sharp(iconBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(outputDir, 'icon-192.png'));
  await sharp(iconBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, 'icon-512.png'));
  console.log('Generated legacy icon-192.png & icon-512.png');

  // Favicon 64x64 PNG
  await sharp(iconBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(outputDir, 'favicon.png'));
  console.log('Generated favicon.png');
}

main().catch(console.error);
