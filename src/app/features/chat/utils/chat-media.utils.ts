export type ChatMediaMessageType = 'image' | 'audio' | 'file';

export interface ChatMediaValidationResult {
  valid: boolean;
  messageType?: ChatMediaMessageType;
  errorKey?: 'chatMediaTypeNotSupported' | 'chatMediaFileTooLarge';
}

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/aac',
  'audio/x-m4a',
]);
const FILE_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
]);
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const AUDIO_MAX_BYTES = 25 * 1024 * 1024;
const FILE_MAX_BYTES = 50 * 1024 * 1024;

export const CHAT_MEDIA_FILE_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/aac',
  'application/pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.zip',
].join(',');

export function resolveChatMediaMessageType(mimeType: string): ChatMediaMessageType | null {
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  if (IMAGE_MIME_TYPES.has(normalized)) return 'image';
  if (AUDIO_MIME_TYPES.has(normalized)) return 'audio';
  if (FILE_MIME_TYPES.has(normalized)) return 'file';
  return null;
}

export function getChatMediaMaxBytes(messageType: ChatMediaMessageType): number {
  switch (messageType) {
    case 'image':
      return IMAGE_MAX_BYTES;
    case 'audio':
      return AUDIO_MAX_BYTES;
    case 'file':
      return FILE_MAX_BYTES;
  }
}

export function getAudioMaxBytes(): number {
  return AUDIO_MAX_BYTES;
}

export function validateChatMediaFile(file: File): ChatMediaValidationResult {
  const messageType = resolveChatMediaMessageType(file.type);
  if (!messageType) {
    return { valid: false, errorKey: 'chatMediaTypeNotSupported' };
  }
  const maxBytes = getChatMediaMaxBytes(messageType);
  if (file.size > maxBytes) {
    return { valid: false, errorKey: 'chatMediaFileTooLarge', messageType };
  }
  return { valid: true, messageType };
}

export function getPreferredAudioMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  if (typeof MediaRecorder !== 'undefined') {
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
  }
  return 'audio/webm';
}

export function getAudioFileExtension(mimeType: string): string {
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  if (normalized.includes('mp4') || normalized.includes('m4a')) return 'm4a';
  if (normalized.includes('ogg')) return 'ogg';
  return 'webm';
}

export function createVoiceNoteFile(blob: Blob, mimeType: string): File {
  const extension = getAudioFileExtension(mimeType);
  const filename = `voice-${Date.now()}.${extension}`;
  return new File([blob], filename, { type: mimeType.split(';')[0].trim() });
}

export function getFileIconName(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  switch (extension) {
    case 'pdf':
      return 'picture_as_pdf';
    case 'doc':
    case 'docx':
      return 'description';
    case 'xls':
    case 'xlsx':
    case 'csv':
      return 'table_chart';
    case 'ppt':
    case 'pptx':
      return 'slideshow';
    case 'zip':
      return 'folder_zip';
    case 'txt':
      return 'article';
    default:
      return 'attach_file';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatAudioDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
