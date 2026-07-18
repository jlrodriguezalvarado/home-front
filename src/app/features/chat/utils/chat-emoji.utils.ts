export type ChatTextSegment = { kind: 'text'; value: string } | { kind: 'emoji'; value: string };

const EMOJI_PATTERN = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}))*/gu;

export function splitChatTextSegments(text: string): ChatTextSegment[] {
  const segments: ChatTextSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(EMOJI_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, index) });
    }
    segments.push({ kind: 'emoji', value: match[0] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) });
  }
  return segments.length ? segments : [{ kind: 'text', value: text }];
}

export function isEmojiOnlyMessage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const withoutEmojis = trimmed.replace(EMOJI_PATTERN, '').replace(/\s/g, '');
  return withoutEmojis.length === 0;
}
