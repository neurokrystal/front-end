export interface IStorageService {
  uploadFile(path: string, file: Buffer, contentType: string, isPublic?: boolean): Promise<string>;
  deleteFile(path: string): Promise<void>;
  getPublicUrl(path: string): string;
}
