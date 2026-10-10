// Доводка Android-проекта после `cap add android`. Безопасно запускать повторно.
//  1. Фиксирует портретную ориентацию (сцена боя рассчитана на вертикальный экран).
//  2. Подставляет версию приложения из package.json.
// Если нужная строка не найдена (например, шаблон Capacitor изменился) — просто предупреждает и идёт дальше.
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const warn = (m) => console.warn(`⚠️  patch-android: ${m}`);

// 1. ориентация
const manifestPath = 'android/app/src/main/AndroidManifest.xml';
if (fs.existsSync(manifestPath)) {
  let xml = fs.readFileSync(manifestPath, 'utf8');
  if (xml.includes('android:screenOrientation')) {
    console.log('ориентация уже задана');
  } else if (xml.includes('<activity')) {
    xml = xml.replace('<activity', '<activity\n            android:screenOrientation="portrait"');
    fs.writeFileSync(manifestPath, xml);
    console.log('✅ ориентация: портрет');
  } else warn('в AndroidManifest.xml не найден <activity>');
} else warn('AndroidManifest.xml не найден — сначала выполните `npx cap add android`');

// 2. версия
const gradlePath = 'android/app/build.gradle';
if (fs.existsSync(gradlePath)) {
  let g = fs.readFileSync(gradlePath, 'utf8');
  const before = g;
  g = g.replace(/versionName\s+"[^"]*"/, `versionName "${pkg.version}"`);
  if (g !== before) { fs.writeFileSync(gradlePath, g); console.log(`✅ versionName ${pkg.version}`); }
} else warn('android/app/build.gradle не найден');
