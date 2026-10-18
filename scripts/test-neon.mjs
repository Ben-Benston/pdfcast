import { neon } from '@neondatabase/serverless'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

async function runTests() {
  console.log('--- 1. Testing Neon Postgres ---')
  const sql = neon(process.env.DATABASE_URL)
  const dbInfo = await sql`SELECT current_database(), current_user, count(*)::int as count FROM rooms`
  console.log('✓ Postgres connected successfully:')
  console.log(dbInfo)

  console.log('\n--- 2. Testing Neon Object Storage (S3) ---')
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  })

  const testKey = 'test-room-verify.txt'
  await s3.send(new PutObjectCommand({
    Bucket: 'pdfs',
    Key: testKey,
    Body: 'Testing Relay PDF Object Storage integration',
    ContentType: 'text/plain',
  }))
  console.log('✓ PutObject to "pdfs" bucket succeeded')

  const getRes = await s3.send(new GetObjectCommand({ Bucket: 'pdfs', Key: testKey }))
  const bodyText = await getRes.Body.transformToString()
  console.log('✓ Read object back:', bodyText)

  await s3.send(new DeleteObjectCommand({ Bucket: 'pdfs', Key: testKey }))
  console.log('✓ DeleteObject cleanup succeeded')

  console.log('\n--- 3. Testing Neon Functions ---')
  const fnRes = await fetch(process.env.NEON_FUNCTION_HELLO_BASE_URL)
  const fnText = await fnRes.text()
  console.log('✓ Neon Function hello returned:', fnText.trim())

  console.log('\nALL NEON SERVICES TESTED AND PASSING!')
}

runTests().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})
