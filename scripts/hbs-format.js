#!/usr/bin/env node
/**
 * Handlebars formatter
 *
 * 수정 항목:
 *   1. "{ {"  →  "{{"   (여는 delimiter 사이 공백 제거)
 *   2. "} }"  →  "}}"   (닫는 delimiter 사이 공백 제거)
 *   3. "{{ ~" →  "{{~"  (whitespace-control tilde 앞 공백 제거)
 *   4. "~ }}" →  "~}}"  (whitespace-control tilde 뒤 공백 제거)
 *
 * 사용법:
 *   node scripts/hbs-format.js                  # 현재 디렉토리 전체 .hbs
 *   node scripts/hbs-format.js templates/       # 특정 디렉토리
 *   node scripts/hbs-format.js file.hbs         # 특정 파일
 *   node scripts/hbs-format.js --dry-run        # 변경 내용만 확인 (파일 덮어쓰기 없음)
 */

const fs = require('fs');
const path = require('path');

const RULES = [
  // "{ {" → "{{"  단, { {{ 처럼 뒤에 { 가 더 오는 경우는 CSS 객체 리터럴이므로 제외
  [/\{ \{(?!\{)/g,   '{{'],
  // "} }" → "}}"  단, }} } 처럼 앞에 } 가 있는 경우는 Handlebars}} + 리터럴 } 이므로 제외
  [/(?<!\})\} \}/g,  '}}'],
  // "{{ ~" → "{{~"  (whitespace-control tilde 앞 공백)
  [/\{\{ ~/g,        '{{~'],
  // "~ }}" → "~}}"  (whitespace-control tilde 뒤 공백)
  [/~ \}\}/g,        '~}}'],
];

function format(content) {
  return RULES.reduce((str, [pattern, replacement]) => str.replace(pattern, replacement), content);
}

function findHbsFiles(target) {
  const stat = fs.statSync(target);
  if (!stat.isDirectory()) return [target];

  const results = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const fullPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      results.push(...findHbsFiles(fullPath));
    } else if (entry.name.endsWith('.hbs')) {
      results.push(fullPath);
    }
  }
  return results;
}

function diffSummary(original, formatted) {
  const origLines = original.split('\n');
  const fmtLines = formatted.split('\n');
  const changes = [];
  for (let i = 0; i < Math.max(origLines.length, fmtLines.length); i++) {
    if (origLines[i] !== fmtLines[i]) {
      changes.push({ line: i + 1, before: origLines[i], after: fmtLines[i] });
    }
  }
  return changes;
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targets = args.filter(a => !a.startsWith('--'));
const roots = targets.length > 0 ? targets : ['.'];

let fixedCount = 0;
let unchangedCount = 0;
let errorCount = 0;

for (const root of roots) {
  let files;
  try {
    files = findHbsFiles(root);
  } catch (e) {
    console.error(`오류: "${root}" 을(를) 읽을 수 없습니다 — ${e.message}`);
    errorCount++;
    continue;
  }

  for (const file of files) {
    try {
      const original = fs.readFileSync(file, 'utf8');
      const formatted = format(original);

      if (original === formatted) {
        unchangedCount++;
        continue;
      }

      const changes = diffSummary(original, formatted);
      const relPath = path.relative(process.cwd(), file);

      if (dryRun) {
        console.log(`\n[dry-run] ${relPath} (${changes.length}줄 변경 예정)`);
        for (const { line, before, after } of changes.slice(0, 5)) {
          console.log(`  L${line} - ${before.trimStart()}`);
          console.log(`  L${line} + ${after.trimStart()}`);
        }
        if (changes.length > 5) console.log(`  ... 외 ${changes.length - 5}줄`);
      } else {
        fs.writeFileSync(file, formatted, 'utf8');
        console.log(`수정됨 (${changes.length}줄): ${relPath}`);
      }

      fixedCount++;
    } catch (e) {
      console.error(`오류: ${file} — ${e.message}`);
      errorCount++;
    }
  }
}

const mode = dryRun ? '[dry-run] ' : '';
console.log(`\n${mode}완료: ${fixedCount}개 파일 수정, ${unchangedCount}개 변경 없음${errorCount ? `, ${errorCount}개 오류` : ''}`);
if (dryRun && fixedCount > 0) console.log('실제 수정하려면 --dry-run 없이 실행하세요.');
