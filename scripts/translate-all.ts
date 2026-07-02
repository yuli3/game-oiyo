import fs from 'fs';
import { translate } from 'google-translate-api-x';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales');
const DEFAULT_LOCALE = 'en';

function isMissingOrEnglish(val: any, defaultVal: any): boolean {
  if (typeof val !== 'string') return false;
  if (val.trim() === '') return true;
  if (val === defaultVal && typeof defaultVal === 'string' && defaultVal.trim() !== '' && /[a-zA-Z]/.test(defaultVal)) return true;
  return false;
}

function flattenWithPaths(obj: any, defaultObj: any, prefix = ''): { path: string, text: string }[] {
  let res: { path: string, text: string }[] = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    const defVal = defaultObj ? defaultObj[key] : undefined;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      res = res.concat(flattenWithPaths(val, defVal, fullKey));
    } else {
      if (isMissingOrEnglish(val, defVal)) {
        res.push({ path: fullKey, text: defVal || val });
      }
    }
  }
  return res;
}

function setNested(obj: any, path: string, value: any) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('🔄 Starting Automatic Translation (Google Translate API) for BLOG-OIYO...');
  
  if (!fs.existsSync(LOCALES_DIR)) return console.error('No src/locales found.');
  
  const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));
  const langs = files.map(f => f.replace('.json', ''));
  
  const baseFile = path.join(LOCALES_DIR, `${DEFAULT_LOCALE}.json`);
  if (!fs.existsSync(baseFile)) return console.error('No en baseline found.');
  const defaultObj = JSON.parse(fs.readFileSync(baseFile, 'utf8'));

  for (const lang of langs) {
    if (lang === DEFAULT_LOCALE) continue;
    console.log(`\n======================================\nTranslating for Language: [${lang}]\n======================================`);
    
    // Map zh for Google Translate; cn is retired and not part of active locale automation.
    if (lang === 'cn') continue;
    const gLang = lang === 'zh' ? 'zh-CN' : lang === 'zh-TW' ? 'zh-TW' : lang;

    const langFile = path.join(LOCALES_DIR, `${lang}.json`);
    let langObj = JSON.parse(fs.readFileSync(langFile, 'utf8'));

    const toTranslate = flattenWithPaths(langObj, defaultObj);
    const validToTranslate = toTranslate.filter(t => t.text && t.text.trim().length > 0 && /[a-zA-Z]/.test(t.text));

    if (validToTranslate.length === 0) continue;

    console.log(`Found ${validToTranslate.length} items to translate...`);
    
    let modified = false;
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < validToTranslate.length; i += BATCH_SIZE) {
      const batch = validToTranslate.slice(i, i + BATCH_SIZE);
      const textsToTranslate = batch.map(b => b.text);
      
      try {
        const res = await translate(textsToTranslate, { forceBatch: false, to: gLang });
        const resultsArray = Array.isArray(res) ? res : [res];
        
        for (let j = 0; j < batch.length; j++) {
          setNested(langObj, batch[j].path, resultsArray[j].text);
        }
        modified = true;
        process.stdout.write('+');
      } catch (error: any) {
        console.error(`\n❌ Error translating batch in ${lang}: ${error.message}`);
        if (error.message.includes('TooManyRequests')) {
          console.log('Rate limit hit. Sleeping for 10 seconds...');
          await sleep(10000);
          i -= BATCH_SIZE; 
          continue;
        }
      }
      await sleep(1500); 
    }
    
    if (modified) {
      fs.writeFileSync(langFile, JSON.stringify(langObj, null, 2));
      console.log(`\n✅ Saved translations for ${lang}.json`);
    }
  }
  console.log('\n🎉 Finished all translations!');
}

run().catch(console.error);
