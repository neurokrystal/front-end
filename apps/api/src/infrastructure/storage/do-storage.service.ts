import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/infrastructure/config";
import type { IStorageService } from "./storage.interface";

export class DigitalOceanStorageService implements IStorageService {
  private client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor() {
    if (!env.DO_SPACES_KEY || !env.DO_SPACES_SECRET || !env.DO_SPACES_ENDPOINT || !env.DO_SPACES_BUCKET || !env.DO_SPACES_REGION) {
      throw new Error("Missing Digital Ocean Spaces configuration");
    }

    this.bucket = env.DO_SPACES_BUCKET;
    this.endpoint = env.DO_SPACES_ENDPOINT;
    
    this.client = new S3Client({
      endpoint: this.endpoint,
      region: env.DO_SPACES_REGION,
      credentials: {
        accessKeyId: env.DO_SPACES_KEY,
        secretAccessKey: env.DO_SPACES_SECRET,
      },
    });
  }

  async uploadFile(path: string, file: Buffer, contentType: string, isPublic: boolean = true): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      Body: file,
      ContentType: contentType,
      ACL: isPublic ? "public-read" : "private",
    });

    await this.client.send(command);
    return this.getPublicUrl(path);
  }

  async deleteFile(path: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    await this.client.send(command);
  }

  getPublicUrl(path: string): string {
    const cleanEndpoint = this.endpoint.replace(/^https?:\/\//, "");
    return `https://${this.bucket}.${cleanEndpoint}/${path}`;
  }
}
