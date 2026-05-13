import type { IStorageService } from "./storage.interface";

export class MockStorageService implements IStorageService {
  async uploadFile(path: string, file: Buffer, contentType: string, isPublic?: boolean): Promise<string> {
    console.log(`[MOCK STORAGE] Uploading ${path} (${file.length} bytes, ${contentType})`);
    return `https://mock-storage.com/${path}`;
  }

  async deleteFile(path: string): Promise<void> {
    console.log(`[MOCK STORAGE] Deleting ${path}`);
  }

  getPublicUrl(path: string): string {
    return `https://mock-storage.com/${path}`;
  }
}
