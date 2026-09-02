using System;
using System.IO;
using System.Text;

class Patch {
  static void Main() {
    string path = @"C:\Users\emanu\Downloads\leads\app\api\generate\route.ts";
    string s = File.ReadAllText(path, Encoding.UTF8);

    // 1) Provider type includes auto
    s = s.Replace(
      "type Provider = 'openai' | 'claude' | 'gemini';",
      "type Provider = 'openai' | 'claude' | 'gemini' | 'auto';");

    // 2) provider parsing supports auto
    s = s.Replace(
      "    const provider = (String(body?.provider || 'claude').toLowerCase() as Provider);",
      "    const requestedProvider = String(body?.provider || 'auto').toLowerCase();\n    const provider: Provider = (requestedProvider === 'auto' ? 'openai' : requestedProvider) as Provider;");

    // 3) resilient safeCall wrapper for the 3 providers + fallback
    string oldBlock = @"    let generatedText = '';
    let activeProvider: Provider = provider;

    if (provider === 'openai') {
      generatedText = (await callOpenAI(proposalPrompt)) || '';
    } else if (provider === 'claude') {
      generatedText = (await callClaude(proposalPrompt)) || '';
    } else if (provider === 'gemini') {
      generatedText = (await callGemini(proposalPrompt)) || '';
    }

    if (!generatedText) {
      const fallbackProviderOrder: Provider[] = ['claude', 'gemini', 'openai'];
      for (const fallbackProvider of fallbackProviderOrder) {
        if (fallbackProvider === provider) continue;
        const text = fallbackProvider === 'claude' ? await callClaude(proposalPrompt) : fallbackProvider === 'gemini' ? await callGemini(proposalPrompt) : await callOpenAI(proposalPrompt);
        if (text) {
          generatedText = text;
          activeProvider = fallbackProvider;
          break;
        }
      }
    }";

    string newBlock = @"    let generatedText = '';
    let activeProvider: Provider = provider;

    const safeCall = async (
      call: (input: string) => Promise<string | null>,
      name: Provider,
    ): Promise<{ text: string; provider: Provider } | null> => {
      try {
        const text = (await call(proposalPrompt)) || '';
        return text ? { text, provider: name } : null;
      } catch {
        return null;
      }
    };

    if (provider === 'openai') {
      const result = await safeCall(callOpenAI, 'openai');
      if (result) { generatedText = result.text; activeProvider = result.provider; }
    } else if (provider === 'claude') {
      const result = await safeCall(callClaude, 'claude');
      if (result) { generatedText = result.text; activeProvider = result.provider; }
    } else if (provider === 'gemini') {
      const result = await safeCall(callGemini, 'gemini');
      if (result) { generatedText = result.text; activeProvider = result.provider; }
    }

    if (!generatedText) {
      const fallbackProviderOrder: Provider[] = ['claude', 'gemini', 'openai'];
      for (const fallbackProvider of fallbackProviderOrder) {
        if (fallbackProvider === provider) continue;
        const result = await safeCall(
          fallbackProvider === 'claude' ? callClaude : fallbackProvider === 'gemini' ? callGemini : callOpenAI,
          fallbackProvider,
        );
        if (result) {
          generatedText = result.text;
          activeProvider = result.provider;
          break;
        }
      }
    }";

    if (!s.Contains(oldBlock)) {
      Console.WriteLine("OLD_BLOCK_NOT_FOUND");
      return;
    }
    s = s.Replace(oldBlock, newBlock);

    // write UTF-8 without BOM
    using (var sw = new StreamWriter(path, false, new UTF8Encoding(false))) {
      sw.Write(s);
    }
    Console.WriteLine("ROUTE_PATCH_OK");
  }
}
