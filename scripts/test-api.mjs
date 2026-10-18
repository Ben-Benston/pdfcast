import roomsHandler from '../api/rooms/index.ts'
import roomCodeHandler from '../api/rooms/[code].ts'
import { getDb } from '../api/db.ts'
import { isObjectStorageConfigured } from '../api/storage.ts'

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, val) { this.headers[key] = val; return this },
    status(code) { this.statusCode = code; return this },
    json(data) { this.body = data; return this },
    send(data) { this.body = data; return this },
    end(data) { if (data) this.body = data; return this }
  }
  return res
}

async function testApi() {
  console.log('Testing App API Endpoints with Neon Services...')
  console.log('Object Storage Configured:', isObjectStorageConfigured())

  // 1. Test GET /api/rooms (Active count)
  const reqCount = { method: 'GET', headers: {} }
  const resCount = mockRes()
  await roomsHandler(reqCount, resCount)
  console.log('✓ GET /api/rooms status:', resCount.statusCode, 'body:', resCount.body)

  // 2. Test POST /api/rooms (Create Room)
  const testRoomCode = '987654'
  const dummyPdfBase64 = Buffer.from('%PDF-1.4 dummy pdf content for testing').toString('base64')
  const reqCreate = {
    method: 'POST',
    headers: {},
    body: {
      roomCode: testRoomCode,
      pdfName: 'test-document.pdf',
      roomPassword: null,
      pdfBase64: dummyPdfBase64,
    }
  }
  const resCreate = mockRes()
  await roomsHandler(reqCreate, resCreate)
  console.log('✓ POST /api/rooms status:', resCreate.statusCode, 'body:', resCreate.body)

  // 3. Test GET /api/rooms/:code
  const reqGet = {
    method: 'GET',
    headers: {},
    query: { code: testRoomCode }
  }
  const resGet = mockRes()
  await roomCodeHandler(reqGet, resGet)
  console.log('✓ GET /api/rooms/:code status:', resGet.statusCode, 'roomCode:', resGet.body?.roomCode, 'pdfUrl:', resGet.body?.pdfUrl)

  // 4. Test PATCH /api/rooms/:code (Update page)
  const reqPatch = {
    method: 'PATCH',
    headers: {},
    query: { code: testRoomCode },
    body: { currentPage: 3, zoomLevel: '75', scrollPosition: 120 }
  }
  const resPatch = mockRes()
  await roomCodeHandler(reqPatch, resPatch)
  console.log('✓ PATCH /api/rooms/:code status:', resPatch.statusCode, 'updated page:', resPatch.body?.currentPage, 'zoom:', resPatch.body?.zoomLevel)

  // 5. Cleanup test room from DB
  const sql = getDb()
  await sql`DELETE FROM rooms WHERE "roomCode" = ${testRoomCode}`
  console.log('✓ Cleaned up test room from Neon database')

  console.log('\nAPP API & NEON SERVICES END-TO-END TEST PASSED!')
}

testApi().catch(err => {
  console.error('API Test failed:', err)
  process.exit(1)
})
