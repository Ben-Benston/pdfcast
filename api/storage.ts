import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

export function isObjectStorageConfigured(): boolean {
  return Boolean(
    process.env.AWS_ENDPOINT_URL_S3 &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  )
}

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-2',
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  })
}

export async function uploadToStorage(
  fileName: string,
  buffer: Buffer,
  contentType: string = 'application/pdf'
): Promise<string> {
  const bucketName = process.env.NEON_STORAGE_BUCKET || 'pdfs'
  const client = getS3Client()

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
    })
  )

  const endpoint = (process.env.AWS_ENDPOINT_URL_S3 || '').replace(/\/+$/, '')
  return `${endpoint}/${bucketName}/${encodeURIComponent(fileName)}`
}

export async function deleteFromStorage(fileName: string): Promise<void> {
  if (!isObjectStorageConfigured()) return
  try {
    const bucketName = process.env.NEON_STORAGE_BUCKET || 'pdfs'
    const client = getS3Client()
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileName,
      })
    )
  } catch (err) {
    console.error('Failed to delete from object storage:', err)
  }
}
