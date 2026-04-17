import { google } from 'googleapis';

// Check if Google Sheets is configured
function isConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
    process.env.GOOGLE_SHEETS_PRIVATE_KEY
  );
}

// Initialize Google Sheets client
function getGoogleSheetsClient() {
  if (!isConfigured()) {
    throw new Error('Google Sheets not configured');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
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
  if (!isConfigured()) {
    console.warn('Google Sheets not configured, skipping sync');
    return true;
  }

  try {
    const sheets = getGoogleSheetsClient();

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
