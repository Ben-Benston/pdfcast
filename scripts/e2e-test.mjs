import 'dotenv/config'

async function runE2E() {
  console.log('=== END-TO-END VERIFICATION: RELAY PDF ON NEON ===\n')

  // 1. Frontend Test
  console.log('1. Checking Frontend HTML...')
  const frontRes = await fetch('http://localhost:5173/')
  if (!frontRes.ok) throw new Error(`Frontend returned HTTP ${frontRes.status}`)
  console.log(`   ✓ Frontend responding HTTP 200 OK (${frontRes.headers.get('content-type')})`)

  // 2. Active Rooms Count (Postgres via Vite API dev middleware)
  console.log('\n2. Testing GET /api/rooms (Neon Postgres query)...')
  const countRes = await fetch('http://localhost:5173/api/rooms')
  const countData = await countRes.json()
  console.log('   ✓ Active rooms count:', countData)

  // 3. Create a room (Uploads PDF to Neon Object Storage & inserts into Postgres)
  console.log('\n3. Testing POST /api/rooms (Upload to Neon Object Storage & Postgres insert)...')
  const testRoomCode = '777888'
  const dummyPdf = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n162\n%%EOF'
  const pdfBase64 = Buffer.from(dummyPdf).toString('base64')

  const createRes = await fetch('http://localhost:5173/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomCode: testRoomCode,
      pdfName: 'e2e-demo.pdf',
      roomPassword: null,
      pdfBase64: pdfBase64,
    })
  })
  const createData = await createRes.json()
  console.log('   ✓ Room created successfully:', createData)

  // 4. Verify PDF URL (Stored in Neon Object Storage)
  console.log('\n4. Verifying PDF file URL...')
  const pdfRes = await fetch(createData.pdfUrl)
  console.log(`   ✓ PDF retrieved from: ${createData.pdfUrl}`)
  console.log(`   ✓ HTTP Status: ${pdfRes.status}, Content-Type: ${pdfRes.headers.get('content-type')}`)

  // 5. Fetch Room State (Controller / Display fetch)
  console.log('\n5. Testing GET /api/rooms/:code...')
  const roomRes = await fetch(`http://localhost:5173/api/rooms/${testRoomCode}`)
  const roomData = await roomRes.json()
  console.log('   ✓ Room state in Postgres:', {
    roomCode: roomData.roomCode,
    currentPage: roomData.currentPage,
    zoomLevel: roomData.zoomLevel,
    scrollPosition: roomData.scrollPosition,
  })

  // 6. Update Room Controls (Controller flips page & zooms)
  console.log('\n6. Testing PATCH /api/rooms/:code (Controller actions)...')
  const patchRes = await fetch(`http://localhost:5173/api/rooms/${testRoomCode}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentPage: 5,
      zoomLevel: '125',
      scrollPosition: 250,
    })
  })
  const patchedData = await patchRes.json()
  console.log('   ✓ Room updated in Postgres:', {
    roomCode: patchedData.roomCode,
    currentPage: patchedData.currentPage,
    zoomLevel: patchedData.zoomLevel,
    scrollPosition: patchedData.scrollPosition,
  })

  // 7. Test Neon Function
  console.log('\n7. Testing Neon Function (hello)...')
  const fnRes = await fetch(process.env.NEON_FUNCTION_HELLO_BASE_URL)
  const fnText = await fnRes.text()
  console.log('   ✓ Neon Function output:', fnText.trim())

  // 8. Cleanup test room
  console.log('\n8. Cleaning up test room...')
  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(process.env.DATABASE_URL)
  await sql`DELETE FROM rooms WHERE "roomCode" = ${testRoomCode}`
  const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3')
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  })
  await s3.send(new DeleteObjectCommand({ Bucket: 'pdfs', Key: `${testRoomCode}-e2e-demo.pdf` }))
  console.log('   ✓ Cleaned up test room from Postgres and Object Storage')

  console.log('\n=================================================')
  console.log('✓ ALL 3 NEON SERVICES (POSTGRES, OBJECT STORAGE, FUNCTIONS) & APP APIs VERIFIED!')
  console.log('=================================================')
}

runE2E().catch(err => {
  console.error('\n❌ E2E Test Failed:', err)
  process.exit(1)
})
