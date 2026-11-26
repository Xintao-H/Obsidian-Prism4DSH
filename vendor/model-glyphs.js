// DSH adaptation, 2026-11-25. Use the module export instead of installing a global.
// Obsidian Prism — Official Brand Model Glyph & Orchestrator Cut Crystal Bar Module (model-glyph-crystal.js)
// Extracted from ui-runtime.js: manages model label parsing, brand SVG glyphs on triggers/panel rows,
// SVG <template> clone prototype cache, and Orchestrator cut-crystal prism bar loop.

(function (root) {
  'use strict';
  const G = root || (typeof globalThis !== 'undefined' ? globalThis : window);
  if (!G) return;

  const BRAND_PATHS = {
    gemini:
      'M24 12.024c-6.437.388-11.59 5.539-11.977 11.976h-.047C11.588 17.563 6.436 12.412 0 12.024v-.047C6.437 11.588 11.588 6.437 11.976 0h.047c.388 6.437 5.54 11.588 11.977 11.977z',
    claude:
      'm4.714 15.956l4.718-2.648l.079-.23l-.08-.128h-.23l-.79-.048l-2.695-.073l-2.337-.097l-2.265-.122l-.57-.121l-.535-.704l.055-.353l.48-.321l.685.06l1.518.104l2.277.157l1.651.098l2.447.255h.389l.054-.158l-.133-.097l-.103-.098l-2.356-1.596l-2.55-1.688l-1.336-.972l-.722-.491L2 6.223l-.158-1.008l.656-.722l.88.06l.224.061l.893.686l1.906 1.476l2.49 1.833l.364.304l.146-.104l.018-.072l-.164-.274l-1.354-2.446l-1.445-2.49l-.644-1.032l-.17-.619a3 3 0 0 1-.103-.729L6.287.133L6.7 0l.995.134l.42.364l.619 1.415L9.735 4.14l1.555 3.03l.455.898l.243.832l.09.255h.159V9.01l.127-1.706l.237-2.095l.23-2.695l.08-.76l.376-.91l.747-.492l.583.28l.48.685l-.067.444l-.286 1.851l-.558 2.903l-.365 1.942h.213l.243-.242l.983-1.306l1.652-2.064l.728-.82l.85-.904l.547-.431h1.032l.759 1.129l-.34 1.166l-1.063 1.347l-.88 1.142l-1.263 1.7l-.79 1.36l.074.11l.188-.02l2.853-.606l1.542-.28l1.84-.315l.832.388l.09.395l-.327.807l-1.967.486l-2.307.462l-3.436.813l-.043.03l.049.061l1.548.146l.662.036h1.62l3.018.225l.79.522l.473.638l-.08.485l-1.213.62l-1.64-.389l-3.825-.91l-1.31-.329h-.183v.11l1.093 1.068l2.003 1.81l2.508 2.33l.127.578l-.321.455l-.34-.049l-2.204-1.657l-.85-.747l-1.925-1.62h-.127v.17l.443.649l2.343 3.521l.122 1.08l-.17.353l-.607.213l-.668-.122l-1.372-1.924l-1.415-2.168l-1.141-1.943l-.14.08l-.674 7.254l-.316.37l-.728.28l-.607-.461l-.322-.747l.322-1.476l.388-1.924l.316-1.53l.285-1.9l.17-.632l-.012-.042l-.14.018l-1.432 1.967l-2.18 2.945l-1.724 1.845l-.413.164l-.716-.37l.066-.662l.401-.589l2.386-3.036l1.439-1.882l.929-1.086l-.006-.158h-.055L4.138 18.56l-1.13.146l-.485-.456l.06-.746l.231-.243l1.907-1.312Z',
    openai:
      'M20.562 10.188c.25-.688.313-1.376.25-2.063c-.062-.687-.312-1.375-.625-2c-.562-.937-1.375-1.687-2.312-2.125c-1-.437-2.063-.562-3.125-.312c-.5-.5-1.063-.938-1.688-1.25S11.687 2 11 2a5.17 5.17 0 0 0-3 .938c-.875.624-1.5 1.5-1.813 2.5c-.75.187-1.375.5-2 .875c-.562.437-1 1-1.375 1.562c-.562.938-.75 2-.625 3.063a5.44 5.44 0 0 0 1.25 2.874a4.7 4.7 0 0 0-.25 2.063c.063.688.313 1.375.625 2c.563.938 1.375 1.688 2.313 2.125c1 .438 2.062.563 3.125.313c.5.5 1.062.937 1.687 1.25S12.312 22 13 22a5.17 5.17 0 0 0 3-.937c.875-.625 1.5-1.5 1.812-2.5a4.54 4.54 0 0 0 1.938-.875c.562-.438 1.062-.938 1.375-1.563c.562-.937.75-2 .625-3.062c-.125-1.063-.5-2.063-1.188-2.876m-7.5 10.5c-1 0-1.75-.313-2.437-.875c0 0 .062-.063.125-.063l4-2.312a.5.5 0 0 0 .25-.25a.57.57 0 0 0 .062-.313V11.25l1.688 1v4.625a3.685 3.685 0 0 1-3.688 3.813M5 17.25c-.438-.75-.625-1.625-.438-2.5c0 0 .063.063.125.063l4 2.312a.56.56 0 0 0 .313.063c.125 0 .25 0 .312-.063l4.875-2.812v1.937l-4.062 2.375A3.7 3.7 0 0 1 7.312 19c-1-.25-1.812-.875-2.312-1.75M3.937 8.563a3.8 3.8 0 0 1 1.938-1.626v4.751c0 .124 0 .25.062.312a.5.5 0 0 0 .25.25l4.875 2.813l-1.687 1l-4-2.313a3.7 3.7 0 0 1-1.75-2.25c-.25-.937-.188-2.062.312-2.937M17.75 11.75l-4.875-2.812l1.687-1l4 2.312c.625.375 1.125.875 1.438 1.5s.5 1.313.437 2.063a3.7 3.7 0 0 1-.75 1.937c-.437.563-1 1-1.687 1.25v-4.75c0-.125 0-.25-.063-.312c0 0-.062-.126-.187-.188m1.687-2.5s-.062-.062-.125-.062l-4-2.313c-.125-.062-.187-.062-.312-.062s-.25 0-.313.062L9.812 9.688V7.75l4.063-2.375c.625-.375 1.312-.5 2.062-.5c.688 0 1.375.25 2 .688c.563.437 1.063 1 1.313 1.625s.312 1.375.187 2.062m-10.5 3.5l-1.687-1V7.063c0-.688.187-1.438.562-2C8.187 4.438 8.75 4 9.375 3.688a3.37 3.37 0 0 1 2.062-.313c.688.063 1.375.375 1.938.813c0 0-.063.062-.125.062l-4 2.313a.5.5 0 0 0-.25.25c-.063.125-.063.187-.063.312zm.875-2L12 9.5l2.187 1.25v2.5L12 14.5l-2.188-1.25z',
  };

  const PANEL_MODEL_ROW_RE = /orchestrator|编排|调度|gemini|claude|sonnet|opus|haiku|gpt|openai|\bo[134]\b|deepseek/i;
  const ZH_EFFORT_PAREN_RE = /\s*[（(]\s*(超高|极高|超深|高思考|中思考|低思考|极低|最低|深度思考|思考中?|中等|高|中|低|自动)\s*[)）]/g;

  const stripTranslatedEffortSuffix = (rawText) => {
    return String(rawText || '').replace(ZH_EFFORT_PAREN_RE, '').trim();
  };

  const normalizeModelEffortLabel = (rawText) =>
    String(rawText || '').replace(ZH_EFFORT_PAREN_RE, (_, t) =>
      /超高|极高|超深/.test(t) ? ' (xhigh)' : t[0] === '中' ? ' (medium)' : t.includes('低') ? ' (low)' : t === '自动' ? ' (auto)' : ' (high)'
    );

  const RE_CL = /\b(claude|anthropic|sonnet|opus|haiku)\b/;
  const RE_GPT = /\b(gpt|openai|o[134]|codex)\b/;
  const RE_DS = /\bdeepseek\b/;

  const parseModelLabelInfo = (rawText) => {
    const norm = normalizeModelEffortLabel(rawText).toLowerCase();
    const base = stripTranslatedEffortSuffix(rawText).toLowerCase();
    const isOrchestrator = /\borchestrator\b|编排|调度器/.test(base);
    let brand = 'gemini';
    if (RE_CL.test(base)) brand = 'claude';
    else if (RE_GPT.test(base) || RE_DS.test(base)) brand = 'openai';
    else if (isOrchestrator || (/\bantigravity\b/.test(base) && !/\b(gemini|neon|argon|carbon|hydrogen|flash)\b/.test(base))) brand = 'antigravity';

    const tier = /\b(gpt-oss|fixed)\b|固定/.test(norm) ? 'fixed'
      : /\b(xhigh|extra)\b|超高|极高|超深/.test(norm) ? 'xhigh'
      : /\b(high|max|thinking)\b|深度思考|高思考|思考|高/.test(norm) ? 'high'
      : /\b(low|lite|minimal)\b|低思考|极低|最低|低/.test(norm) ? 'low'
      : /\b(medium|med)\b|中思考|中等|中/.test(norm) ? 'medium'
      : isOrchestrator ? 'auto' : 'medium';
    return { brand, tier, isOrchestrator, camp: brand === 'claude' ? 'claude' : 'gemini' };
  };

  const resolveMascotCamp = (rawText) => {
    const b = stripTranslatedEffortSuffix(rawText).toLowerCase();
    return RE_CL.test(b) ? 'claude' : RE_DS.test(b) || b.includes('深度求索') ? 'deepseek' : RE_GPT.test(b) ? 'gpt' : 'gemini';
  };

  module.exports = { BRAND_PATHS, parseModelLabelInfo };
})(globalThis);
