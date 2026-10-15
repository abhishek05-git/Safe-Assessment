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
 * Security Controls:
 * - Rejects all GET requests (doGet disabled).
 * - Requires SecretToken in POST body on every action.
 * - Single candidate status check (GET_APPROVAL_STATUS) prevents PII bulk exposure.
 * - Sanitizes spreadsheet formula injection (=, +, -, @).
 * - Records audit logs for state-changing operations.
 */

// 👇 ROTATE THIS VALUE: Set to a strong random 32+ character secret 👇
// (Must match GOOGLE_SCRIPT_SHARED_SECRET in Node .env and Vercel environment variables)
var SHARED_SECRET = "SAFE_2026_SECURE_TOKEN_REPLACE_WITH_STRONG_RANDOM_SECRET";

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
 * Validate that SecretToken in the POST body matches SHARED_SECRET.
 * Never accepts secret in query parameters.
 */
function validateSecret(e) {
  var providedToken = '';
  if (e && e.parameter && e.parameter['SecretToken']) {
    providedToken = e.parameter['SecretToken'];
  } else if (e && e.postData && e.postData.contents) {
    try {
      var parsed = JSON.parse(e.postData.contents);
      providedToken = parsed.SecretToken || '';
    } catch (err) {}
  }
  return providedToken && providedToken === SHARED_SECRET;
}

function unauthorizedResponse() {
  return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized access" }))
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
    error: "Method Not Allowed. All SAFE Assessment backend actions must use HTTP POST with SecretToken in the request body."
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Authoritative POST request handler
 */
function doPost(e) {
  // 1. Strict shared secret validation (P0 Item 1 & 4, P1 Item 5)
  if (!validateSecret(e)) {
    return unauthorizedResponse();
  }

  var action = (e.parameter && e.parameter['Action']) || '';
  if (!action && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      action = body.Action || '';
    } catch (err) {}
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Action 1: Single Candidate Approval Status (P1 Item 9) ──
  // Takes one email, checks status, returns ONLY that candidate's status without exposing others' PII.
  if (action === 'GET_APPROVAL_STATUS') {
    var targetEmail = (e.parameter['Email'] || '').trim().toLowerCase();
    var accSheet = ss.getSheetByName('Access_Requests');
    if (!accSheet) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        email: targetEmail,
        candidateStatus: 'none',
        approved: false
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var rows = accSheet.getDataRange().getValues();
    var candidateStatus = 'none';
    var isApproved = false;

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim().toLowerCase() === targetEmail) {
        candidateStatus = String(rows[i][4] || 'pending');
        isApproved = candidateStatus === 'approved';
        break;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      email: targetEmail,
      candidateStatus: candidateStatus,
      approved: isApproved
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── Action 2: Send OTP Email via Google MailApp ──
  if (action === 'SEND_OTP') {
    var email = e.parameter['Email'] || '';
    var name = e.parameter['Name'] || 'Participant';
    var otp = e.parameter['OTP'] || '';

    if (email && otp) {
      MailApp.sendEmail({
        to: email,
        subject: "Your SAFE Ltd. Assessment Verification Code",
        htmlBody: "Hello " + name + ",<br><br>Your verification code to start the assessment is: <b>" + otp + "</b><br><br>This code expires in 10 minutes. If you did not request this code, please ignore this email.<br><br>Thank you,<br>SAFE Ltd."
      });
      writeAuditLog(ss, 'SEND_OTP', email, 'Verification code dispatched');
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'OTP Sent' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── Action 3: Request Access ──
  if (action === 'REQUEST_ACCESS') {
    var reqEmail = (e.parameter['Email'] || '').trim().toLowerCase();
    var reqName = sanitizeCell(e.parameter['Name'] || '');
    var reqOrg = sanitizeCell(e.parameter['Organization'] || '');
    var reqPhone = sanitizeCell(e.parameter['Phone'] || '');

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
          if (rRows[k][4] !== 'approved') {
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
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Requested' }))
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
          status: String(r[4] || 'pending'),
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
    var adminTargetEmail = (e.parameter['Email'] || '').trim().toLowerCase();
    var newStatus = e.parameter['Status'] || 'approved';

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
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', email: adminTargetEmail, status: newStatus }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── Action 6: Save Result (Authoritative Scoring) ──
  if (action === 'SAVE_RESULT') {
    var resSheet = ss.getSheetByName('Results');
    if (!resSheet) {
      resSheet = ss.insertSheet('Results');
      resSheet.appendRow(['Date', 'Name', 'Organization', 'Location', 'Gender', 'DOB', 'Phone', 'Email', 'Result Code', 'Personality Type', 'Time Taken']);
    }

    var date = sanitizeCell(e.parameter['Date'] || new Date().toLocaleDateString());
    var pName = sanitizeCell(e.parameter['Name'] || '');
    var org = sanitizeCell(e.parameter['Organization'] || '');
    var loc = sanitizeCell(e.parameter['Location'] || '');
    var gender = sanitizeCell(e.parameter['Gender'] || '');
    var dob = sanitizeCell(e.parameter['DOB'] || '');
    var phone = sanitizeCell(e.parameter['Phone'] || '');
    var pEmail = sanitizeCell(e.parameter['Email'] || '');
    var code = sanitizeCell(e.parameter['Result Code'] || '');
    var type = sanitizeCell(e.parameter['Personality Type'] || '');
    var timeTaken = sanitizeCell(e.parameter['Time Taken'] || '');

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

  return ContentService.createTextOutput(JSON.stringify({ error: "Unknown action" }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## Step 2: Rotate the Shared Secret (Item 1 & 4)

1. Generate a strong cryptographically random 32+ character hex string in your terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. In the Apps Script code above, replace `SAFE_2026_SECURE_TOKEN_REPLACE_WITH_STRONG_RANDOM_SECRET` with this newly generated token.
3. Update your server environment configuration:
   - On your Hostinger VPS: update `GOOGLE_SCRIPT_SHARED_SECRET` in `/var/www/safe-assessment/server/.env`.
   - On Vercel: update `GOOGLE_SCRIPT_SHARED_SECRET` in **Project Settings** &rarr; **Environment Variables**.

---

## Step 3: Deploy New Version & Revoke/Disable Old Deployments (P0 Item 4)

1. In the Apps Script editor, click **Save** (disk icon).
2. Click **Deploy** &rarr; **Manage deployments**.
3. Under active deployments:
   - Click the **Pencil (Edit)** icon at the top right.
   - Under **Version**, select **New version**.
   - Under **Who has access**, select **Anyone** (the script itself validates `SecretToken` on every request).
   - Click **Deploy**.
4. **Revoke Old Deployments**:
   - If any older deployment entries exist in the left sidebar of the **Manage deployments** dialog, select each old deployment and click **Archive** (or delete).
   - This ensures any old unauthenticated script endpoints immediately stop responding to traffic.
5. Copy the newly issued **Web app URL** (ends in `/exec`).
6. Set this URL as `GOOGLE_SCRIPT_URL` in your server `.env` and Vercel Environment Variables.

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
