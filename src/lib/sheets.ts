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
    privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY.trim();
    // Only replace if escaped (key should have real newlines from Vercel CLI)
    if (privateKey.includes('\\n') && !privateKey.includes('\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
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

    return true;
  } catch (error) {
    console.error('Error ensuring sheet exists:', error);
    return false;
  }
}

export async function appendEntryToSheet(
  spreadsheetId: string,
  sheetName: string,
  entry: EntryData
): Promise<boolean> {
  console.log('appendEntryToSheet called:', { spreadsheetId, sheetName, entry });

  if (!isConfigured()) {
    console.warn('Google Sheets not configured, skipping sync');
    return true;
  }

  try {
    console.log('Getting Google Sheets client...');
    const sheets = getGoogleSheetsClient();
    console.log('Google Sheets client obtained');

    // Ensure the tab exists first
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
        '', // Winner? column (empty by default)
      ],
    ];

    // Quote sheet name to handle special characters
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${sheetName}'!A:I`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return true;
  } catch (error) {
    console.error('Error appending to Google Sheet:', error);
    console.error('Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return false;
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
