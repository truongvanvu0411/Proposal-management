import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AppConfig, StorageService } from '../types';

export function createS3Storage(config: AppConfig): StorageService {
  const client = new S3Client({
    endpoint: config.s3Endpoint,
    region: config.s3Region,
    forcePathStyle: config.s3ForcePathStyle,
    credentials: {
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
    },
  });

  return {
    async putObject({ objectKey, body, contentType }) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.s3Bucket,
          Key: objectKey,
          Body: body,
          ContentType: contentType,
        }),
      );
    },

    async createUploadUrl({ objectKey, contentType, expiresInSeconds = 900 }) {
      const command = new PutObjectCommand({
        Bucket: config.s3Bucket,
        Key: objectKey,
        ContentType: contentType,
      });
      return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    },

    async createDownloadUrl({ objectKey, expiresInSeconds = 900 }) {
      const command = new GetObjectCommand({
        Bucket: config.s3Bucket,
        Key: objectKey,
      });
      return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    },

    async assertObjectExists(objectKey) {
      await client.send(
        new HeadObjectCommand({
          Bucket: config.s3Bucket,
          Key: objectKey,
        }),
      );
    },

    async getObject({ objectKey }) {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: config.s3Bucket,
          Key: objectKey,
        }),
      );
      const bytes = await response.Body?.transformToByteArray();
      return Buffer.from(bytes ?? []);
    },
  };
}
