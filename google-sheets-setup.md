# Google Sheets Apps Script Backend Setup (Secure Node API Integration)

This Google Apps Script runs privately behind your Node.js API. It strictly validates the server-to-server shared secret (`GOOGLE_SCRIPT_SHARED_SECRET`) on **every single request**. Direct calls without the shared secret are rejected.

---

### Step 1: Open Apps Script Editor
1. Open your **SAFE Assessment** Google Sheet.
2. In the top menu, click **Extensions** &rarr; **Apps Script**.
3. Replace all code in the script editor with the following code:

```javascript
/**
 * SAFE Assessment - Secure Backend Script (Node API Integration Only)
 * Protected with SHARED_SECRET validation on every action.
 */

// 👇 SET YOUR STRONG SHARED SECRET HERE (Must match GOOGLE_SCRIPT_SHARED_SECRET in Node .env) 👇
var SHARED_SECRET = "SAFE_2026_SECURE_TOKEN_REPLACE_WITH_STRONG_RANDOM_SECRET";

function validateSecret(e) {
  var providedToken = '';
  if (e && e.parameter && e.parameter['SecretToken']) {
    providedToken = e.parameter['SecretToken'];
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

function doGet(e) {
  // Validate shared secret on all GET requests
  if (!validateSecret(e)) {
    return unauthorizedResponse();
  }

  var action = (e.parameter && e.parameter['Action']) || '';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── 1. GET ALL CANDIDATE APPROVALS (Node API Only) ──
  if (action === 'GET_APPROVALS') {
    var sheet = ss.getSheetByName('Access_Requests');
    if (!sheet) {
      sheet = ss.insertSheet('Access_Requests');
      sheet.appendRow(['Email', 'Name', 'Organization', 'Phone', 'Status', 'RequestedAt', 'ApprovedAt']);
    }
    var rows = sheet.getDataRange().getValues();
    var approvals = {};
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
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

  // ── 2. GET RESULTS (Node API Only) ──
  if (action === 'GET_RESULTS') {
    var resSheet = ss.getSheetByName('Results');
    var list = [];
    if (resSheet) {
      var dataRows = resSheet.getDataRange().getValues();
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

  // ── 3. CANDIDATE ACCESS REQUEST (Node API Only) ──
  if (action === 'REQUEST_ACCESS') {
    var email = (e.parameter['Email'] || '').trim().toLowerCase();
    var name = e.parameter['Name'] || '';
    var org = e.parameter['Organization'] || '';
    var phone = e.parameter['Phone'] || '';

    if (email) {
      var accSheet = ss.getSheetByName('Access_Requests');
      if (!accSheet) {
        accSheet = ss.insertSheet('Access_Requests');
        accSheet.appendRow(['Email', 'Name', 'Organization', 'Phone', 'Status', 'RequestedAt', 'ApprovedAt']);
      }
      var rows2 = accSheet.getDataRange().getValues();
      var found = false;
      var now = new Date().toISOString();
      for (var k = 1; k < rows2.length; k++) {
        if (String(rows2[k][0]).trim().toLowerCase() === email) {
          found = true;
          if (rows2[k][4] !== 'approved') {
            accSheet.getRange(k + 1, 2).setValue(name);
            accSheet.getRange(k + 1, 3).setValue(org);
            accSheet.getRange(k + 1, 4).setValue(phone);
            accSheet.getRange(k + 1, 5).setValue('pending');
            accSheet.getRange(k + 1, 6).setValue(now);
          }
          break;
        }
      }
      if (!found) {
        accSheet.appendRow([email, name, org, phone, 'pending', now, '']);
      }
      writeAuditLog(ss, 'REQUEST_ACCESS', email, 'Candidate requested access via API');
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Requested' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── 4. SET APPROVAL (Node API Only) ──
  if (action === 'SET_APPROVAL') {
    var targetEmail = (e.parameter['Email'] || '').trim().toLowerCase();
    var newStatus = e.parameter['Status'] || 'approved';

    if (targetEmail) {
      var accSheet2 = ss.getSheetByName('Access_Requests');
      if (accSheet2) {
        var rows3 = accSheet2.getDataRange().getValues();
        for (var m = 1; m < rows3.length; m++) {
          if (String(rows3[m][0]).trim().toLowerCase() === targetEmail) {
            accSheet2.getRange(m + 1, 5).setValue(newStatus);
            accSheet2.getRange(m + 1, 7).setValue(newStatus === 'approved' ? new Date().toISOString() : '');
            break;
          }
        }
      }
      writeAuditLog(ss, 'SET_APPROVAL', targetEmail, 'Status set to ' + newStatus);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', email: targetEmail, status: newStatus }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'SAFE Assessment backend endpoint active.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // Validate shared secret on all POST requests
  if (!validateSecret(e)) {
    return unauthorizedResponse();
  }

  var action = (e.parameter && e.parameter['Action']) || '';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── 5. SEND OTP EMAIL ──
  if (action === 'SEND_OTP') {
    var email = e.parameter['Email'] || '';
    var name = e.parameter['Name'] || 'Participant';
    var otp = e.parameter['OTP'] || '';

    if (email && otp) {
      MailApp.sendEmail({
        to: email,
        subject: "Your SAFE Ltd. Assessment Verification Code",
        htmlBody: "Hello " + name + ",<br><br>Your verification code to start the assessment is: <b>" + otp + "</b><br><br>This code will expire in 10 minutes. If you did not request this code, please ignore this email.<br><br>Thank you,<br>SAFE Ltd."
      });
      writeAuditLog(ss, 'SEND_OTP', email, 'Verification code dispatched via email');
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'OTP Sent' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── 6. SAVE RESULT ──
  if (action === 'SAVE_RESULT') {
    var sheet = ss.getSheetByName('Results');
    if (!sheet) {
      sheet = ss.insertSheet('Results');
      sheet.appendRow(['Date', 'Name', 'Organization', 'Location', 'Gender', 'DOB', 'Phone', 'Email', 'Result Code', 'Personality Type', 'Time Taken']);
    }

    var date = e.parameter['Date'] || new Date().toLocaleDateString();
    var pName = e.parameter['Name'] || '';
    var org = e.parameter['Organization'] || '';
    var loc = e.parameter['Location'] || '';
    var gender = e.parameter['Gender'] || '';
    var dob = e.parameter['DOB'] || '';
    var phone = e.parameter['Phone'] || '';
    var pEmail = e.parameter['Email'] || '';
    var code = e.parameter['Result Code'] || '';
    var type = e.parameter['Personality Type'] || '';
    var timeTaken = e.parameter['Time Taken'] || '';

    sheet.appendRow([date, pName, org, loc, gender, dob, phone, pEmail, code, type, timeTaken]);
    writeAuditLog(ss, 'SAVE_RESULT', pEmail, 'Result recorded: ' + code);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Result Saved' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return doGet(e);
}
```

---

### Step 2: Publish New Deployment
1. Click the **Save** (disk) icon in Apps Script.
2. Click **Deploy** &rarr; **Manage deployments**.
3. Click the **Pencil (Edit)** icon at the top right.
4. Under **Version**, choose **New version**.
5. Click **Deploy** &rarr; **Done**.
6. Copy the Web app URL and set it as `GOOGLE_SCRIPT_URL` in your `.env` file on your VPS.
