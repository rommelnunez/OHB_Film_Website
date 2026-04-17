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
  let writeTestResult = 'not attempted';
  let jsonLength = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.length || 0;
  let jsonStart = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.substring(0, 50) || '';

  // Prefer individual env vars (more reliable with Vercel)
  let authMethod = 'none';
  let privateKey = '';

  if (hasEmail && hasKey) {
    authMethod = 'individual env vars';
    clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL!.trim();
    privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY!.trim();
    keyLength = privateKey.length;
    keyStart = privateKey.substring(0, 40);
    keyEnd = privateKey.substring(privateKey.length - 40);
    parseResult = 'using individual vars';
  } else if (hasJson) {
    authMethod = 'JSON env var';
    try {
      const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
      parseResult = 'JSON parsed';
      clientEmail = creds.client_email || 'missing';
      privateKey = creds.private_key || '';
      keyLength = privateKey.length;
      keyStart = privateKey.substring(0, 40);
      keyEnd = privateKey.substring(privateKey.length - 40);
    } catch (e: unknown) {
      const error = e as Error;
      parseResult = `JSON parse error: ${error.message}`;
    }
  }

  if (clientEmail && privateKey) {
    try {
      // Fix escaped newlines if needed
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '104IZsSdipQhx-ZOSj0pcHRUDZ9baNKqNb1Ap23r3akc';

      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      testResult = `success - found ${spreadsheet.data.sheets?.length} sheets: ${spreadsheet.data.sheets?.map(s => s.properties?.title).join(', ')}`;

      try {
        const debugTab = '__debug';
        const hasDebugTab = spreadsheet.data.sheets?.some(
          (s) => s.properties?.title === debugTab
        );
        if (!hasDebugTab) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [{ addSheet: { properties: { title: debugTab } } }],
            },
          });
        }
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `'${debugTab}'!A:B`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[new Date().toISOString(), 'debug-sheets write test']],
          },
        });
        writeTestResult = 'success';
      } catch (we: unknown) {
        const werror = we as Error & { code?: number; status?: number };
        const code = werror.code ?? werror.status ?? '';
        writeTestResult = `error${code ? ` (${code})` : ''}: ${werror.message}`;
      }
    } catch (e: unknown) {
      const error = e as Error;
      testResult = `error: ${error.message}`;
    }
  }

  const spreadsheetIdValue = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '(using fallback: 104IZsS...)';

  return NextResponse.json({
    authMethod,
    hasJson,
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
    writeTestResult,
  });
}
