# How to Connect SAFE Assessment to Google Sheets (With Real-Time Admin Approval)

The assessment sends all participant details and test results to a Google Sheet, and enables **cross-device real-time Admin approval** when deployed on Vercel!

---

### Step 1: Open Your Google Sheet's Apps Script
1. Open your Google Sheet.
2. In the top menu, click **Extensions** &rarr; **Apps Script**.
3. Replace all code in the editor with this script:

```javascript
/**
 * SAFE Assessment Backend - Google Apps Script
 * Handles: OTP Emails, Results, and Real-Time Cross-Device Access Approvals
 */

function doGet(e) {
  var action = (e.parameter && e.parameter['Action']) || '';
  
  // ── 1. GET ALL CANDIDATE APPROVALS ──
  if (action === 'GET_APPROVALS') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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
  
  // ── 2. CANDIDATE REQUESTS ACCESS (Logged in / OTP verified) ──
  if (action === 'REQUEST_ACCESS') {
    var email = (e.parameter['Email'] || '').trim().toLowerCase();
    var name = e.parameter['Name'] || '';
    var org = e.parameter['Organization'] || '';
    var phone = e.parameter['Phone'] || '';
    
    if (email) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName('Access_Requests');
      if (!sheet) {
        sheet = ss.insertSheet('Access_Requests');
        sheet.appendRow(['Email', 'Name', 'Organization', 'Phone', 'Status', 'RequestedAt', 'ApprovedAt']);
      }
      var rows = sheet.getDataRange().getValues();
      var found = false;
      var now = new Date().toISOString();
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]).trim().toLowerCase() === email) {
          found = true;
          // Keep existing status if already approved
          if (rows[i][4] !== 'approved') {
            sheet.getRange(i + 1, 2).setValue(name);
            sheet.getRange(i + 1, 3).setValue(org);
            sheet.getRange(i + 1, 4).setValue(phone);
            sheet.getRange(i + 1, 5).setValue('pending');
            sheet.getRange(i + 1, 6).setValue(now);
          }
          break;
        }
      }
      if (!found) {
        sheet.appendRow([email, name, org, phone, 'pending', now, '']);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Requested' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // ── 3. ADMIN SETS APPROVAL (Approved or Revoked) ──
  if (action === 'SET_APPROVAL') {
    var email = (e.parameter['Email'] || '').trim().toLowerCase();
    var newStatus = e.parameter['Status'] || 'approved'; // 'approved' or 'pending'
    
    if (email) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName('Access_Requests');
      if (sheet) {
        var rows = sheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          if (String(rows[i][0]).trim().toLowerCase() === email) {
            sheet.getRange(i + 1, 5).setValue(newStatus);
            sheet.getRange(i + 1, 7).setValue(newStatus === 'approved' ? new Date().toISOString() : '');
            break;
          }
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', email: email, status: newStatus }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'SAFE Assessment Google Apps Script Web App is active and secure.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var action = (e.parameter && e.parameter['Action']) || '';
  
  // ── 4. SEND OTP EMAIL ──
  if (action === 'SEND_OTP') {
    var email = e.parameter['Email'] || '';
    var name = e.parameter['Name'] || 'Participant';
    var otp = e.parameter['OTP'] || '';
    
    if (email) {
      MailApp.sendEmail({
        to: email,
        subject: "Your SAFE Ltd. Assessment OTP",
        htmlBody: "Hello " + name + ",<br><br>Your verification code to start the assessment is: <b>" + otp + "</b><br><br>Thank you!"
      });
    }
    return ContentService.createTextOutput("OTP Sent").setMimeType(ContentService.MimeType.TEXT);
  }

  // ── 5. SAVE ASSESSMENT RESULT ──
  if (action === 'SAVE_RESULT') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Results') || ss.getActiveSheet();
    var date = e.parameter['Date'] || '';
    var name = e.parameter['Name'] || '';
    var org = e.parameter['Organization'] || '';
    var loc = e.parameter['Location'] || '';
    var gender = e.parameter['Gender'] || '';
    var dob = e.parameter['DOB'] || '';
    var phone = e.parameter['Phone'] || '';
    var email = e.parameter['Email'] || '';
    var code = e.parameter['Result Code'] || '';
    var type = e.parameter['Personality Type'] || '';
    
    sheet.appendRow([date, name, org, loc, gender, dob, phone, email, code, type]);
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  }

  return doGet(e);
}
```

---

### Step 2: Deploy New Version (Very Important!)
When updating existing code in Google Apps Script, you **must publish a new version** for the changes to go live:
1. Click the **Save** icon (disk icon).
2. Click the blue **Deploy** button at the top right, and click **Manage deployments**.
3. In the modal, click the **Pencil (Edit)** icon at the top right.
4. Under **Version**, click the dropdown and choose **New version**.
5. Click the blue **Deploy** button at the bottom right.
6. Click **Done**.

---

### Step 3: Done!
Now, whenever a participant enters OTP on their phone or computer, their request automatically syncs through Google Sheets directly to your Admin panel! When you click **Approve Access**, their device unlocks in real time!
