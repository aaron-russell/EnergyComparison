import { URL } from 'node:url';
import fs from 'node:fs';
import Ajv from 'ajv';
import standalone from 'ajv/dist/standalone/index.js';

const schema = JSON.parse(
  fs.readFileSync(new URL('../public/tariff.schema.json', import.meta.url), 'utf8'),
);
const ajv = new Ajv({ allErrors: true, code: { source: true, esm: true } });
const validate = ajv.compile(schema);
const source = standalone(ajv, validate).replaceAll(
  'require("ajv/dist/runtime/ucs2length").default',
  'unicodeLength',
);
fs.mkdirSync(new URL('../src/generated/', import.meta.url), { recursive: true });
fs.writeFileSync(
  new URL('../src/generated/validate-tariff.js', import.meta.url),
  `// Generated from public/tariff.schema.json. Do not edit.\nimport unicodeLengthModule from 'ajv/dist/runtime/ucs2length.js';\nconst unicodeLength = unicodeLengthModule.default || unicodeLengthModule;\n${source}\n`,
);
