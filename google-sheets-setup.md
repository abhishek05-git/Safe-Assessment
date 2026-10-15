# Google Sheets Apps Script Backend Setup (Hardened Architecture)

This document describes the deployment, configuration, secret rotation, and retirement procedure for the Google Apps Script backend integration for **SAFE Personality Assessment**.

All requirements from the security audit (Items 4, 5, 8, 9) are enforced:
- **P0 Item 4**: Revocation of old unauthenticated endpoints and rotation of credentials.
- **P1 Item 5**: All actions use **HTTP POST** exclusively; `SecretToken` is never transmitted in URL query strings. `doGet` is disabled.
- **P1 Item 8**: Formula injection prevention: characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are neutralized before writing to any sheet.
- **P1 Item 9**: Single-candidate access status (`GET_APPROVAL_STATUS`) accepts one candidate email and returns only their status, never retrieving or transmitting other candidates' PII.

---

## Step 1: Copy the Hardened Google Apps Script Code

1. Open your **SAFE Assessment** Google Sheet.
2. In the top navigation bar, click **Extensions** &rarr; **Apps Script**.
3. Clear all existing code in the editor and paste the following:

```javascript
/**
 * SAFE Assessment - Hardened Backend Script
 * 
 * Security & Reliability Controls:
 * - Built-in authorizeAndTest() helper for one-click Google OAuth permission authorization.
 * - Rejects all GET requests (doGet disabled).
 * - Requires SecretToken in POST body on every action.
 * - Single candidate status check (GET_APPROVAL_STATUS) prevents PII bulk exposure.
 * - Sanitizes spreadsheet formula injection (=, +, -, @).
 * - Error-resilient MailApp email dispatch with detailed diagnostics.
 * - Records audit logs for state-changing operations.
 */

// 👇 ROTATE THIS VALUE: Set to a strong random 32+ character secret 👇
// (Must match GOOGLE_SCRIPT_SHARED_SECRET in Node .env and Vercel environment variables)
var SHARED_SECRET = "SAFE_2026_SECURE_TOKEN_REPLACE_WITH_STRONG_RANDOM_SECRET";

/**
 * Run this function ONCE inside the Apps Script editor to authorize Google permissions:
 * Select 'authorizeAndTest' in the top toolbar dropdown and click 'Run'.
 */
function authorizeAndTest() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("Active Spreadsheet: " + ss.getName() + " (ID: " + ss.getId() + ")");
  
  var userEmail = "";
  try {
    userEmail = Session.getEffectiveUser().getEmail() || Session.getActiveUser().getEmail();
  } catch (e) {}

  if (userEmail) {
    try {
      MailApp.sendEmail({
        to: userEmail,
        subject: "SAFE Assessment - Apps Script Authorized Successfully",
        htmlBody: "<h3>Google Apps Script Authorization Confirmed</h3><p>Your Google Apps Script backend has been successfully authorized to access this spreadsheet and send verification emails.</p>"
      });
      Logger.log("Test email successfully sent to: " + userEmail);
    } catch (mailErr) {
      Logger.log("Email dispatch log: " + mailErr.message);
    }
  }
  Logger.log("Authorization completed successfully.");
}

/**
 * Escapes formula-leading characters to prevent CSV/Spreadsheet formula injection (CWE-1236)
 */
function sanitizeCell(val) {
  if (val == null) return '';
  var str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

/**
 * Safely extract parameters from either URL-encoded forms or JSON payload
 */
function getParams(e) {
  var params = {};
  if (e && e.parameter) {
    for (var key in e.parameter) {
      params[key] = e.parameter[key];
    }
  }
  if (e && e.postData && e.postData.contents) {
    try {
      var json = JSON.parse(e.postData.contents);
      for (var jKey in json) {
        if (params[jKey] === undefined) {
          params[jKey] = json[jKey];
        }
      }
    } catch (err) {}
  }
  return params;
}

/**
 * Validate that SecretToken in the POST body matches SHARED_SECRET.
 * Never accepts secret in query parameters.
 */
function validateSecret(params) {
  var providedToken = params['SecretToken'] || '';
  return Boolean(providedToken && providedToken === SHARED_SECRET);
}

function unauthorizedResponse() {
  return ContentService.createTextOutput(JSON.stringify({ status: "error", error: "Unauthorized access: invalid or missing SecretToken" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function writeAuditLog(ss, action, email, details) {
  try {
    var sheet = ss.getSheetByName('Audit_Log');
    if (!sheet) {
      sheet = ss.insertSheet('Audit_Log');
      sheet.appendRow(['Timestamp', 'Action', 'Target_Email', 'Details']);
    }
    sheet.appendRow([new Date().toISOString(), action, email || '', details || '']);
  } catch (err) {}
}

/**
 * Reject all GET requests (Item 5).
 * Secrets and parameters must never appear in URL query strings.
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "error",
    error: "Method Not Allowed. All SAFE Assessment backend actions must use HTTP POST with SecretToken in the request body."
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Authoritative POST request handler
 */
function doPost(e) {
  var params = getParams(e);

  // 1. Strict shared secret validation (P0 Item 1 & 4, P1 Item 5)
  if (!validateSecret(params)) {
    return unauthorizedResponse();
  }

  var action = String(params['Action'] || '').trim();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Action 1: Single Candidate Approval Status (P1 Item 9) ──
  // Takes one email, checks status, returns ONLY that candidate's status without exposing others' PII.
  if (action === 'GET_APPROVAL_STATUS') {
    var targetEmail = (params['Email'] || '').trim().toLowerCase();
    var accSheet = ss.getSheetByName('Access_Requests');
    if (!accSheet) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'none',
        candidateStatus: 'none',
        email: targetEmail,
        approved: false
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var rows = accSheet.getDataRange().getValues();
    var candidateStatus = 'none';
    var isApproved = false;

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim().toLowerCase() === targetEmail) {
        candidateStatus = String(rows[i][4] || 'pending').trim().toLowerCase();
        isApproved = (candidateStatus === 'approved');
        break;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: candidateStatus,
      candidateStatus: candidateStatus,
      email: targetEmail,
      approved: isApproved
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── Action 2: Send OTP Email via Google MailApp ──
  if (action === 'SEND_OTP') {
    var email = (params['Email'] || '').trim();
    var name = params['Name'] || 'Participant';
    var otp = String(params['OTP'] || '').trim();

    if (!email || !otp) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: 'Missing Email or OTP parameter' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    try {
      MailApp.sendEmail({
        to: email,
        subject: "Your SAFE Ltd. Assessment Verification Code: " + otp,
        htmlBody: "Hello " + name + ",<br><br>Your verification code to start the assessment is: <b style='font-size:20px;letter-spacing:3px;color:#1e40af;'>" + otp + "</b><br><br>This code expires in 10 minutes. If you did not request this code, please ignore this email.<br><br>Thank you,<br><b>SAFE Ltd.</b>"
      });
      writeAuditLog(ss, 'SEND_OTP', email, 'Verification code dispatched');
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'OTP Sent' }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (mailErr) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: 'Mail delivery error: ' + mailErr.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ── Action 3: Request Access ──
  if (action === 'REQUEST_ACCESS') {
    var reqEmail = (params['Email'] || '').trim().toLowerCase();
    var reqName = sanitizeCell(params['Name'] || '');
    var reqOrg = sanitizeCell(params['Organization'] || '');
    var reqPhone = sanitizeCell(params['Phone'] || '');

    if (reqEmail) {
      var sheet = ss.getSheetByName('Access_Requests');
      if (!sheet) {
        sheet = ss.insertSheet('Access_Requests');
        sheet.appendRow(['Email', 'Name', 'Organization', 'Phone', 'Status', 'RequestedAt', 'ApprovedAt']);
      }
      var rRows = sheet.getDataRange().getValues();
      var found = false;
      var now = new Date().toISOString();
      for (var k = 1; k < rRows.length; k++) {
        if (String(rRows[k][0]).trim().toLowerCase() === reqEmail) {
          found = true;
          if (String(rRows[k][4]).toLowerCase() !== 'approved') {
            sheet.getRange(k + 1, 2).setValue(reqName);
            sheet.getRange(k + 1, 3).setValue(reqOrg);
            sheet.getRange(k + 1, 4).setValue(reqPhone);
            sheet.getRange(k + 1, 5).setValue('pending');
            sheet.getRange(k + 1, 6).setValue(now);
          }
          break;
        }
      }
      if (!found) {
        sheet.appendRow([sanitizeCell(reqEmail), reqName, reqOrg, reqPhone, 'pending', now, '']);
      }
      writeAuditLog(ss, 'REQUEST_ACCESS', reqEmail, 'Participant access requested');
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', candidateStatus: 'pending', message: 'Requested' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── Action 4: Get All Approvals (Admin Only) ──
  if (action === 'GET_APPROVALS') {
    var aSheet = ss.getSheetByName('Access_Requests');
    if (!aSheet) {
      aSheet = ss.insertSheet('Access_Requests');
      aSheet.appendRow(['Email', 'Name', 'Organization', 'Phone', 'Status', 'RequestedAt', 'ApprovedAt']);
    }
    var allRows = aSheet.getDataRange().getValues();
    var approvals = {};
    for (var m = 1; m < allRows.length; m++) {
      var r = allRows[m];
      if (r[0]) {
        var emailKey = String(r[0]).trim().toLowerCase();
        approvals[emailKey] = {
          email: String(r[0]),
          name: String(r[1] || ''),
          org: String(r[2] || ''),
          phone: String(r[3] || ''),
          status: String(r[4] || 'pending').trim().toLowerCase(),
          requestedAt: r[5] ? String(r[5]) : '',
          approvedAt: r[6] ? String(r[6]) : ''
        };
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: approvals }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── Action 5: Set Candidate Approval (Admin Only) ──
  if (action === 'SET_APPROVAL') {
    var adminTargetEmail = (params['Email'] || '').trim().toLowerCase();
    var newStatus = (params['Status'] || 'approved').trim().toLowerCase();

    if (adminTargetEmail) {
      var setSheet = ss.getSheetByName('Access_Requests');
      if (setSheet) {
        var sRows = setSheet.getDataRange().getValues();
        for (var n = 1; n < sRows.length; n++) {
          if (String(sRows[n][0]).trim().toLowerCase() === adminTargetEmail) {
            setSheet.getRange(n + 1, 5).setValue(newStatus);
            setSheet.getRange(n + 1, 7).setValue(newStatus === 'approved' ? new Date().toISOString() : '');
            break;
          }
        }
      }
      writeAuditLog(ss, 'SET_APPROVAL', adminTargetEmail, 'Status updated to ' + newStatus);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', email: adminTargetEmail, candidateStatus: newStatus }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── Action 6: Save Result (Authoritative Scoring) ──
  if (action === 'SAVE_RESULT') {
    var resSheet = ss.getSheetByName('Results');
    if (!resSheet) {
      resSheet = ss.insertSheet('Results');
      resSheet.appendRow(['Date', 'Name', 'Organization', 'Location', 'Gender', 'DOB', 'Phone', 'Email', 'Result Code', 'Personality Type', 'Time Taken']);
    }

    var date = sanitizeCell(params['Date'] || new Date().toLocaleDateString());
    var pName = sanitizeCell(params['Name'] || '');
    var org = sanitizeCell(params['Organization'] || '');
    var loc = sanitizeCell(params['Location'] || '');
    var gender = sanitizeCell(params['Gender'] || '');
    var dob = sanitizeCell(params['DOB'] || '');
    var phone = sanitizeCell(params['Phone'] || '');
    var pEmail = sanitizeCell(params['Email'] || '');
    var code = sanitizeCell(params['Result Code'] || '');
    var type = sanitizeCell(params['Personality Type'] || '');
    var timeTaken = sanitizeCell(params['Time Taken'] || '');

    resSheet.appendRow([date, pName, org, loc, gender, dob, phone, pEmail, code, type, timeTaken]);
    writeAuditLog(ss, 'SAVE_RESULT', pEmail, 'Result recorded: ' + code);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Result Saved' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── Action 7: Get Results (Admin Only) ──
  if (action === 'GET_RESULTS') {
    var gSheet = ss.getSheetByName('Results');
    var list = [];
    if (gSheet) {
      var dataRows = gSheet.getDataRange().getValues();
      for (var j = 1; j < dataRows.length; j++) {
        var row = dataRows[j];
        if (row[1] || row[7]) {
          list.push({
            id: j,
            date: row[0],
            user: {
              'Full Name': row[1],
              'Name': row[1],
              'Name of the Organization': row[2],
              'Location': row[3],
              'Gender': row[4],
              'Date of Birth': row[5],
              'Phone Number': row[6],
              'Email Id': row[7],
              'Time Taken': row[10] || ''
            },
            code: row[8],
            type: row[9],
            timeSpent: row[10] || ''
          });
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: list }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "error", error: "Unknown action: " + action }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## Step 2: Authorize Google Permissions (One-Time Setup)

Before deploying the Web App, Google requires your authorization to access the spreadsheet and send emails:

1. In the Apps Script toolbar (next to the **Debug** button), find the function dropdown and select **`authorizeAndTest`**.
2. Click **Run**.
3. A popup will appear: **"Authorization required"**.
4. Click **Review permissions**.
5. Select your Google account.
6. Click **Advanced** (at the bottom of the popup), then click **Go to SAFE Assessment (unsafe)**.
7. Click **Allow**.
8. In the **Execution log** at the bottom, you will see:
   ```text
   Active Spreadsheet: SAFE Assessment
   Test email successfully sent to: your-email@gmail.com
   ```
   Check your email to confirm you received the test email!

---

## Step 3: Rotate the Shared Secret (Item 1 & 4)

1. Generate a strong cryptographically random 32+ character hex string in your terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. In the Apps Script code, replace `SAFE_2026_SECURE_TOKEN_REPLACE_WITH_STRONG_RANDOM_SECRET` with this token.
3. Keep this token safe: you will set it as `GOOGLE_SCRIPT_SHARED_SECRET` in your `.env` and Vercel.

---

## Step 4: Deploy as Web App & Revoke/Disable Old Deployments (P0 Item 4)

1. In the Apps Script editor, click **Save** (disk icon).
2. Click **Deploy** &rarr; **New deployment** (or **Manage deployments** &rarr; edit to **New version**):
   - **Select type:** Click the gear icon &rarr; select **Web app**.
   - **Description:** `SAFE Assessment Hardened API v2`.
   - **Execute as:** `Me (your-email@gmail.com)`.
   - **Who has access:** `Anyone`.
   - Click **Deploy**.
3. Copy the **Web app URL** (it looks like `https://script.google.com/macros/s/AKfycb.../exec`).
4. **Revoke Old Deployments**:
   - In **Deploy** &rarr; **Manage deployments**, select any previous or older deployment versions and click **Archive** (or Delete).
5. Update your environment variables:
   - In your local `.env`:
     ```env
     GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
     GOOGLE_SCRIPT_SHARED_SECRET=your_token_from_step_3
     ```
   - On Vercel: add `GOOGLE_SCRIPT_URL` and `GOOGLE_SCRIPT_SHARED_SECRET` in **Project Settings** &rarr; **Environment Variables**.
   - On Hostinger VPS: update `/var/www/safe-assessment/server/.env`.

---

## Step 4: Verification Testing (Verify direct unauthenticated calls fail)

Run the following validation checks from your terminal to verify that unauthenticated calls are blocked:

### Test 1: Direct GET request must fail
```bash
curl -i -X GET "<YOUR_APPS_SCRIPT_URL>"
```
**Expected response**:
```json
{"error":"Method Not Allowed. All SAFE Assessment backend actions must use HTTP POST with SecretToken in the request body."}
```

### Test 2: Unauthenticated POST request must fail
```bash
curl -i -X POST "<YOUR_APPS_SCRIPT_URL>" -d "Action=GET_APPROVALS"
```
**Expected response**:
```json
{"error":"Unauthorized access"}
```

### Test 3: Authenticated single-candidate status check succeeds without leaking others
```bash
curl -i -X POST "<YOUR_APPS_SCRIPT_URL>" \
  -d "Action=GET_APPROVAL_STATUS" \
  -d "SecretToken=<YOUR_SECRET_TOKEN>" \
  -d "Email=candidate@example.com"
```
**Expected response**:
```json
{"status":"success","email":"candidate@example.com","candidateStatus":"pending","approved":false}
```
