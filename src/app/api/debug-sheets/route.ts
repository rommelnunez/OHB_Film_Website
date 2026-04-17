import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  const hasJson = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const hasEmail = !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const hasKey = !!process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const hasSpreadsheetId = !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  let parseResult = 'not attempted';
  let clientEmail = '';
  let keyLength = 0;
  let keyStart = '';
  let keyEnd = '';
  let testResult = 'not attempted';
  let jsonLength = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.length || 0;
  let jsonStart = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.substring(0, 50) || '';

  if (hasJson) {
    try {
      const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
      parseResult = 'success';
      clientEmail = creds.client_email || 'missing';
      keyLength = creds.private_key?.length || 0;
      keyStart = creds.private_key?.substring(0, 40) || '';
      keyEnd = creds.private_key?.substring(creds.private_key.length - 40) || '';
      // Check if newlines are literal or escaped
      const hasRealNewline = creds.private_key?.includes('\n');
      const hasEscapedNewline = creds.private_key?.includes('\\n');

      // Check for double-escaped newlines
      let privateKey = creds.private_key;
      if (privateKey.includes('\\n') && !privateKey.includes('\n')) {
        // Double-escaped newlines - fix them
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      // Try to actually use the API
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: creds.client_email,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '104IZsSdipQhx-ZOSj0pcHRUDZ9baNKqNb1Ap23r3akc';

      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      testResult = `success - found ${spreadsheet.data.sheets?.length} sheets: ${spreadsheet.data.sheets?.map(s => s.properties?.title).join(', ')}`;
    } catch (e: unknown) {
      const error = e as Error;
      if (parseResult === 'not attempted') {
        parseResult = `JSON parse error: ${error.message}`;
      }
      testResult = `error: ${error.message}`;
    }
  }

  const spreadsheetIdValue = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '(using fallback: 104IZsS...)';

  return NextResponse.json({
    hasJson,
    jsonLength,
    jsonStart,
    hasEmail,
    hasKey,
    hasSpreadsheetId,
    spreadsheetIdPreview: spreadsheetIdValue.substring(0, 20),
    parseResult,
    clientEmail,
    keyLength,
    keyStart,
    keyEnd,
    hasRealNewline: keyStart.includes('\n'),
    hasEscapedNewline: keyStart.includes('\\n'),
    testResult,
  });
}
