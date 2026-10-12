# How to Connect SAFE Assessment to Google Sheets

The assessment is now programmed to automatically send all participant details and test results to a Google Sheet!

To make this work, you just need to create a Google Apps Script endpoint. Follow these exact steps:

### 1. Set Up Your Google Sheet
1. Open Google Sheets and create a new blank spreadsheet.
2. Name it something like "SAFE Assessment Results".
3. In the first row (Header row), type these exact column names from A to J:
   - Date
   - Name
   - Organization
   - Location
   - Gender
   - DOB
   - Phone
   - Email
   - Result Code
   - Personality Type

### 2. Create the Apps Script
1. In your Google Sheet, click on **Extensions** in the top menu and select **Apps Script**.
2. Delete any code in the editor and paste the following exact script:

```javascript
function doPost(e) {
  var action = e.parameter['Action'];
  
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

  if (action === 'SAVE_RESULT') {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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
}
```

### 3. Deploy the Script
1. Click the blue **Deploy** button at the top right, and select **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in the details:
   - **Description**: SAFE Submissions
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**. (You may be asked to authorize access to your Google account. Click "Review permissions", select your account, click "Advanced", and proceed to the script).
5. Copy the **Web app URL** that is generated.

### 4. Link it to the App
1. Open the file `src/App.jsx` in your code editor.
2. Go to line 52.
3. Paste your copied Web App URL inside the quotes for the `GOOGLE_SHEET_URL` variable.
   
It should look like this:
```javascript
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycb.../exec'
```

That's it! Every time someone finishes the test, their data will automatically appear in your Google Sheet!
