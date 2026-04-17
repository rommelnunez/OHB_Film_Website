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
  let testResult = 'not attempted';

  if (hasJson) {
    try {
      const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
      parseResult = 'success';
      clientEmail = creds.client_email || 'missing';
      keyLength = creds.private_key?.length || 0;

      // Try to actually use the API
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: creds.client_email,
          private_key: creds.private_key,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '104IZsSdipQhx-ZOSj0pcHRUDZ9baNKqNb1Ap23r3akc';

      // Log which ID we're using
      console.log('Using spreadsheetId:', spreadsheetId);

      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      testResult = `success - found ${spreadsheet.data.sheets?.length} sheets: ${spreadsheet.data.sheets?.map(s => s.properties?.title).join(', ')} (using ID: ${spreadsheetId.substring(0, 10)}...)`;
    } catch (e: unknown) {
      const error = e as Error;
      parseResult = `error: ${error.message}`;
      testResult = `error: ${error.message}`;
    }
  }

  const spreadsheetIdValue = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '(using fallback)';

  return NextResponse.json({
    hasJson,
    hasEmail,
    hasKey,
    hasSpreadsheetId,
    spreadsheetIdPreview: spreadsheetIdValue.substring(0, 15) + '...',
    parseResult,
    clientEmail,
    keyLength,
    testResult,
  });
}
