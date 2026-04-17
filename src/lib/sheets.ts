import { google } from 'googleapis';

// Check if Google Sheets is configured
function isConfigured(): boolean {
  const hasJson = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const hasEmail = !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const hasKey = !!process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  console.log('Google Sheets config check:', { hasJson, hasEmail, hasKey });
  return hasJson || (hasEmail && hasKey);
}

// Initialize Google Sheets client
function getGoogleSheetsClient() {
  if (!isConfigured()) {
    throw new Error('Google Sheets not configured');
  }

  let clientEmail: string;
  let privateKey: string;

  // Prefer individual env vars (more reliable with Vercel's newline handling)
  if (process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
    clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL.trim();
    privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY.trim().replace(/\\n/g, '\n');
    console.log('Using individual env vars');
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      clientEmail = creds.client_email;
      privateKey = creds.private_key;
      // Fix escaped newlines if present (Vercel env var issue)
      if (privateKey && privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      console.log('Using GOOGLE_SERVICE_ACCOUNT_JSON');
    } catch (e) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', e);
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON');
    }
  } else {
    throw new Error('No Google Sheets credentials configured');
  }

  console.log('Client email:', clientEmail);
  console.log('Private key length:', privateKey.length);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

interface EntryData {
  name: string;
  email: string;
  phone: string;
  city: string;
  zip?: string;
  tasksCompleted?: number;
  totalEntries: number;
}

// Ensure sheet tab exists, create if it doesn't
async function ensureSheetExists(
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  const sheets = getGoogleSheetsClient();

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const availableTabs = spreadsheet.data.sheets?.map((s) => s.properties?.title).join(', ');
  const existingSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );

  if (!existingSheet) {
    console.log(`Tab "${sheetName}" not found in ${spreadsheetId}. Available: ${availableTabs}. Creating.`);
      // Create new sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: sheetName },
              },
            },
          ],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetName}'!A1:I1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              'Timestamp',
              'Name',
              'Email',
              'Phone',
              'City',
              'Zip',
              'Tasks',
              'Entries',
              'Winner?',
            ],
          ],
        },
      });
    }
}

export type AppendResult = { ok: true } | { ok: false; error: string };

export async function appendEntryToSheet(
  spreadsheetId: string,
  sheetName: string,
  entry: EntryData
): Promise<AppendResult> {
  console.log('appendEntryToSheet called:', { spreadsheetId, sheetName, entry });

  if (!isConfigured()) {
    return { ok: false, error: 'Google Sheets not configured' };
  }

  try {
    const sheets = getGoogleSheetsClient();

    await ensureSheetExists(spreadsheetId, sheetName);

    const timestamp = new Date().toISOString();

    const values = [
      [
        timestamp,
        entry.name,
        entry.email,
        entry.phone,
        entry.city,
        entry.zip || '',
        entry.tasksCompleted || 0,
        entry.totalEntries,
        '',
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${sheetName}'!A:I`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return { ok: true };
  } catch (error) {
    const err = error as Error & { code?: number; status?: number };
    const code = err.code ?? err.status ?? '';
    const msg = `${code ? `[${code}] ` : ''}${err.message} (spreadsheet=${spreadsheetId}, tab="${sheetName}")`;
    console.error('Error appending to Google Sheet:', msg);
    return { ok: false, error: msg };
  }
}

export async function createSheetWithHeaders(
  spreadsheetId: string,
  sheetName: string
): Promise<boolean> {
  try {
    const sheets = getGoogleSheetsClient();

    // Check if sheet already exists
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );

    if (!existingSheet) {
      // Create new sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: sheetName },
              },
            },
          ],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:I1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              'Timestamp',
              'Name',
              'Email',
              'Phone',
              'City',
              'Zip',
              'Tasks',
              'Entries',
              'Winner?',
            ],
          ],
        },
      });
    }

    return true;
  } catch (error) {
    console.error('Error creating sheet:', error);
    return false;
  }
}
