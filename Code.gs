/**
 * IslamMeter — Google Apps Script
 *
 * Bound to the "IslamMeter Assessment" Google Form.
 *
 * Functions:
 *   populateForm()      — Run once to add 30 linear-scale questions (1–5)
 *   doGet(e)            — Web App: reads latest form response, redirects to index.html
 *   doPost(e)           — Web App: receives JSON from index.html, stores in spreadsheet
 *   installTriggers()   — Run once to enable onFormSubmit trigger
 *   onFormSubmit(e)     — Trigger: stores raw response data in spreadsheet
 */

/****************************************************************************
 * CONFIGURATION
 ****************************************************************************/
var CONFIG = {
  INDEX_HTML_URL: 'https://authenticsm1les.github.io/islamMeter/index.html',
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzWQkV93TTmpZAvO1nbHzyvlNU7o85lLNmIszbssN7_76zBfg8haKidCAwmh-bplB2G2A/exec',
  STORAGE_SPREADSHEET_NAME: 'IslamMeter Data',
  WEBHOOK_SHEET: 'Webhook Data',
  RESPONSES_SHEET: 'Raw Responses',
};

/****************************************************************************
 * DIMENSIONS (must match index.html)
 ****************************************************************************/
var DIMENSIONS = [
  { key: 'identity',   label: 'Identity',          qStart: 0, qEnd: 4 },
  { key: 'compliance', label: 'Compliance',        qStart: 5, qEnd: 9 },
  { key: 'political',  label: 'Political Method',  qStart: 10, qEnd: 14 },
  { key: 'cultural',   label: 'Cultural',          qStart: 15, qEnd: 19 },
  { key: 'authority',  label: 'Authority',         qStart: 20, qEnd: 24 },
  { key: 'public',     label: 'Public Sphere',     qStart: 25, qEnd: 29 },
];

/****************************************************************************
 * CORE CALCULATION
 ****************************************************************************/
function mapResponse(val) {
  return (Number(val) || 3) - 3;
}

function calculateScores(rawValues) {
  var mapped = rawValues.map(mapResponse);
  var scores = {};
  DIMENSIONS.forEach(function (d) {
    var sum = 0;
    for (var i = d.qStart; i <= d.qEnd; i++) sum += mapped[i] || 0;
    scores[d.key] = sum;
  });
  return scores;
}

function buildUrl(scores) {
  return CONFIG.INDEX_HTML_URL + '?' +
    DIMENSIONS.map(function (d) {
      return encodeURIComponent(d.key) + '=' + encodeURIComponent(scores[d.key]);
    }).join('&');
}

/****************************************************************************
 * POPULATE FORM — Run ONCE in the editor to add 30 questions
 ****************************************************************************/
function populateForm() {
  var form = FormApp.getActiveForm();
  form.setTitle('IslamMeter Assessment')
    .setDescription('Rate each statement: 1 = Strongly Disagree → 5 = Strongly Agree')
    .setCollectEmail(false)
    .setShowLinkToRespondAgain(true)
    .setAllowResponseEdits(false);

  form.getItems().forEach(function (item) { form.deleteItem(item); });

  var questions = [
    'I feel a deep personal commitment to the core dogmas of Islam.',
    'My sense of self is fundamentally anchored in my belief in the divine.',
    'Whether others see me as Muslim is less important than my internal conviction.',
    'My religious identity is the most important factor in my personal life.',
    'I would maintain my faith even if I were completely isolated from other Muslims.',
    'When I fail to follow an Islamic rule, I view it as my own personal struggle (sin).',
    'I believe the rules of Islam are fixed, even if I struggle to live up to them.',
    'I don\'t believe in "reinterpreting" rules just to make them easier to follow.',
    'I feel a sense of guilt when my actions do not align with Islamic teachings.',
    'I believe that Islamic laws are timeless and not subject to change based on cultural trends.',
    'I believe Islamic values should only be promoted through social influence, not force.',
    'I am opposed to any form of revolutionary or coerced imposition of faith.',
    'I believe in working within existing civic/democratic systems to advocate for values.',
    'I believe that religious influence in politics should respect the rights of all citizens.',
    'I am fundamentally against the use of violence or intimidation to achieve religious goals.',
    'I feel a strong sense of belonging to the global Muslim community (Ummah).',
    'I participate in Islamic cultural traditions because they are part of my heritage.',
    'I feel a sense of comfort being around other Muslims regardless of their piety.',
    'I value the traditions and customs of my culture even when they are distinct from strict religious dogma.',
    'Celebrating community festivals is an essential part of maintaining my identity.',
    'I believe the guidance of traditional scholarship is essential for understanding Islam.',
    'I prefer relying on established consensus rather than personal interpretation.',
    'I am skeptical of "modernized" versions of faith that deviate from tradition.',
    'I believe that learning from qualified scholars is the most reliable path to knowledge.',
    'I trust historical interpretations of texts more than contemporary perspectives.',
    'I believe Islamic ethics should play a visible role in shaping public law.',
    'I think a society functions best when its laws are informed by religious moral frameworks.',
    'I believe religion should not be relegated solely to the private, individual sphere.',
    'I believe that public policy should reflect the moral values derived from my faith.',
    'I see no conflict between living a modern civic life and advocating for religious morality in the public space.',
  ];

  questions.forEach(function (text) {
    form.addScaleItem().setTitle(text).setBounds(1, 5)
      .setLabels('Strongly Disagree', 'Strongly Agree');
  });

  form.setConfirmationMessage(
    'Thank you for completing the assessment.\n\n' +
    'Your personalised IslamMeter dashboard is ready. ' +
    'Click the link below to view your results.\n\n' +
    CONFIG.WEB_APP_URL + '\n\n' +
    'If you are not redirected automatically, click the link above. ' +
    'Data is collected anonymously for research purposes.'
  );

  Logger.log('Added ' + questions.length + ' questions.');
  Logger.log('Form URL: ' + form.getPublishedUrl());
}

/****************************************************************************
 * doGet — Web App: redirect user to index.html with their scores
 ****************************************************************************/
function doGet(e) {
  try {
    var form = FormApp.getActiveForm();

    // Auto-populate form questions if empty
    if (form.getItems(FormApp.ItemType.SCALE).length === 0) {
      populateForm();
    }

    var responses = form.getResponses();
    if (responses.length === 0) {
      return HtmlService.createHtmlOutput(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;">' +
        '<h2>No responses yet</h2>' +
        '<p>Please complete the assessment form first.</p>' +
        '</body></html>'
      );
    }

    var latest = responses[responses.length - 1];
    var itemResponses = latest.getItemResponses();
    var raw = [];
    for (var i = 0; i < itemResponses.length && i < 30; i++) {
      raw.push(itemResponses[i].getResponse());
    }
    while (raw.length < 30) raw.push(3);

    var scores = calculateScores(raw);
    var url = buildUrl(scores);

    var html =
      '<!DOCTYPE html><html lang="en"><head>' +
      '<meta charset="UTF-8">' +
      '<meta http-equiv="refresh" content="0;url=' + url + '">' +
      '<title>Redirecting to IslamMeter</title>' +
      '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      'padding:2rem;text-align:center;color:#1f2937;}a{color:#059669;}</style>' +
      '</head><body>' +
      '<h2>Redirecting to your dashboard…</h2>' +
      '<p>If not redirected, <a href="' + url + '">click here</a>.</p>' +
      '</body></html>';

    return HtmlService.createHtmlOutput(html);

  } catch (err) {
    return HtmlService.createHtmlOutput(
      '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;">' +
      '<h2>Something went wrong</h2><p>' + err.message + '</p>' +
      '<p>Please try again or contact the administrator.</p></body></html>'
    );
  }
}

/****************************************************************************
 * doPost — Web App: receive JSON from index.html and store in spreadsheet
 ****************************************************************************/
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = getOrCreateStorageSpreadsheet();
    var sheet = getSheet(ss, CONFIG.WEBHOOK_SHEET,
      ['Timestamp', 'identity', 'compliance', 'political', 'cultural',
       'authority', 'public', 'archetype', 'archetypeDistance']);

    sheet.appendRow([
      new Date(),
      payload.scores.identity, payload.scores.compliance,
      payload.scores.political, payload.scores.cultural,
      payload.scores.authority, payload.scores.public,
      payload.archetype, payload.archetypeDistance,
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/****************************************************************************
 * onFormSubmit — Trigger: stores raw form response data
 ****************************************************************************/
function onFormSubmit(e) {
  try {
    var response = e.response;
    var itemResponses = response.getItemResponses();
    var raw = [];
    for (var i = 0; i < itemResponses.length && i < 30; i++) {
      raw.push(itemResponses[i].getResponse());
    }
    while (raw.length < 30) raw.push(3);

    var scores = calculateScores(raw);
    var url = buildUrl(scores);
    var ss = getOrCreateStorageSpreadsheet();
    var sheet = getSheet(ss, CONFIG.RESPONSES_SHEET,
      ['Timestamp', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5',
       'Q6', 'Q7', 'Q8', 'Q9', 'Q10',
       'Q11', 'Q12', 'Q13', 'Q14', 'Q15',
       'Q16', 'Q17', 'Q18', 'Q19', 'Q20',
       'Q21', 'Q22', 'Q23', 'Q24', 'Q25',
       'Q26', 'Q27', 'Q28', 'Q29', 'Q30',
       'identity', 'compliance', 'political', 'cultural',
       'authority', 'public', 'Redirect URL']);

    var row = [new Date()].concat(raw).concat([
      scores.identity, scores.compliance, scores.political,
      scores.cultural, scores.authority, scores.public, url
    ]);
    sheet.appendRow(row);

  } catch (err) {
    Logger.log('onFormSubmit error: ' + err.message);
  }
}

/****************************************************************************
 * INSTALL TRIGGERS — Run ONCE in the editor
 ****************************************************************************/
function installTriggers() {
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'onFormSubmit') {
      Logger.log('Trigger already exists.');
      return;
    }
  }

  ScriptApp.newTrigger('onFormSubmit')
    .forForm(FormApp.getActiveForm())
    .onFormSubmit()
    .create();

  Logger.log('onFormSubmit trigger installed.');
}

/****************************************************************************
 * HELPERS
 ****************************************************************************/
function getOrCreateStorageSpreadsheet() {
  var name = CONFIG.STORAGE_SPREADSHEET_NAME;
  var files = DriveApp.getFilesByName(name);
  if (files.hasNext()) return SpreadsheetApp.open(files.next());
  return SpreadsheetApp.create(name);
}

function getSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

/****************************************************************************
 * TEST
 ****************************************************************************/
function testScores() {
  var neutral = [];
  for (var i = 0; i < 30; i++) neutral.push(3);
  Logger.log('Neutral: ' + JSON.stringify(calculateScores(neutral)));

  var high = [];
  for (var i = 0; i < 30; i++) high.push(5);
  Logger.log('All 5s: ' + JSON.stringify(calculateScores(high)));

  var low = [];
  for (var i = 0; i < 30; i++) low.push(1);
  Logger.log('All 1s: ' + JSON.stringify(calculateScores(low)));
}
