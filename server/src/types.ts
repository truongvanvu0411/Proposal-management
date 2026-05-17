import type { UserRole } from '@prisma/client';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  supplierId: string | null;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  appUrl?: string;
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;
  s3Endpoint: string;
  s3Region: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3ForcePathStyle: boolean;
  maxUploadBytes: number;
}

export type DatabaseClient = any;

export interface StorageService {
  putObject(input: {
    objectKey: string;
    body: Buffer | Uint8Array;
    contentType: string;
  }): Promise<void>;
  createUploadUrl(input: {
    objectKey: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<string>;
  createDownloadUrl(input: {
    objectKey: string;
    expiresInSeconds?: number;
  }): Promise<string>;
  assertObjectExists(objectKey: string): Promise<void>;
  getObject(input: { objectKey: string }): Promise<Buffer>;
}

export interface AppDependencies {
  config?: AppConfig;
  db?: DatabaseClient;
  storage?: StorageService;
}
