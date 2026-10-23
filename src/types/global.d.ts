export {};

declare global {
  interface Window {
    tinymce: {
      activeEditor?: TinyMCEEditor;
    };
  }

  interface TinyMCEEditor {
    editorUpload: {
      blobCache: TinyMCEBlobCache;
    };
  }

  interface TinyMCEBlobCache {
    create: (id: string, file: File, base64: string) => TinyMCEBlobInfo;
    add: (blobInfo: TinyMCEBlobInfo) => void;
  }

  interface TinyMCEBlobInfo {
    id(): string;
    filename(): string;
    blob(): Blob;
    base64(): string;
    blobUri(): string; // ✅ Thêm dòng này
  }
}
