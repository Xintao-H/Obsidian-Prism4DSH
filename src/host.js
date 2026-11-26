import { BlockAssembler, createUserMessage } from '@deepseek-ai/dsh-llm';

export const name = 'dsh-obsidian-prism';
export const inject = ['connection', 'webServer', 'llm'];

const instructions = {
  translate: 'Translate the supplied visible text into fluent Simplified Chinese. Preserve code, filenames, identifiers and Markdown. Return only the translation.',
  title: 'Translate this conversation title into concise Simplified Chinese. Output only the translated title.',
  chat: 'Answer the last user in the supplied conversation. This is a text-only side conversation. You have no access to files or tools. Use the user’s language.'
};

function respond(res, status, value) {
  res.writeHead(status, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'});
  res.end(JSON.stringify(value));
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: '/obsidian-prism/model',
    async handler(req, res) {
      if (ctx.connection.requestRejection(req) !== undefined) return respond(res, 403, {error:'请求来源未获 DSH 授权'});
      if (req.method !== 'POST') return respond(res, 405, {error:'请使用 POST'});
      if (!req.headers['content-type']?.startsWith('application/json')) return respond(res, 415, {error:'需要 JSON'});
      const abort = new AbortController();
      const cancel = () => abort.abort();
      res.on('close', cancel);
      try {
        const chunks = [];
        let bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 256 * 1024) return respond(res, 413, {error:'内容过长，请选择较短的一段'});
          chunks.push(Buffer.from(chunk));
        }
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
        catch { return respond(res, 400, {error:'无效的 JSON'}); }
        if (!body || !Object.hasOwn(instructions, body.task) || typeof body.text !== 'string' || !body.text.trim()
            || typeof body.provider !== 'string' || !body.provider || typeof body.model !== 'string' || !body.model) {
          return respond(res, 400, {error:'请先选择模型并提供文本'});
        }
        const assembler = new BlockAssembler();
        for await (const chunk of ctx.llm.stream({
          provider: body.provider, model: body.model, system: instructions[body.task],
          messages: [createUserMessage({content:[{type:'text', text:body.text}], source:{kind:'plugin:dsh-obsidian-prism'}})],
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(180000)])
        })) assembler.push(chunk);
        const answer = assembler.blocks().filter(b => b.type === 'text').map(b => b.text).join('').trim();
        if (!answer) throw new Error('模型未返回可显示的文本');
        respond(res, 200, {text:answer});
      } catch (error) {
        if (!res.destroyed && !res.writableEnded) respond(res, 502, {error:error.message || '模型调用失败'});
      } finally { res.off('close', cancel); }
    }
  }), 'Prism: model actions');
}
