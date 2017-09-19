/***
 * Lazy test setup for a collection of notebooks
 */
function generateNotebookSet()
{
  //define notebooks  
  var nb_arr = [];
  nb_arr.push(new Notebook("Microprosessors II and Embedded Systems", "Micro II_Notebook", "Microprosessors II and Embedded Systems", DriveApp.getRootFolder().getId(), "", "", "") );
  nb_arr.push(new Notebook("Capstone", "Capstone_Notebook", "Capstone", DriveApp.getRootFolder().getId(), "", "", ""));
  nb_arr.push(new Notebook("Network Design, Principals, Protocols and Applications", "Network_Notebook", "Network Design, Principals, Protocols and Applications", DriveApp.getRootFolder().getId(), "", "", ""));
  nb_arr.push(new Notebook("Software Engineering", "Software Engineering_Notebook", "Software Engineering", DriveApp.getRootFolder().getId(), "", "", ""));
  nb_arr.push(new Notebook("GATK research", "GATK Research_Notebook", "GATK reserach with ACANETS", DriveApp.getRootFolder().getId(), "", "", ""));
  
  //make in drive & save properties to user
  while(nb_arr.length != 0)
  {
    var newBook = makeNewNotebookTree(nb_arr.pop(),  DriveApp.getRootFolder().getId());
    newBook = makeNewMasterNotebook(newBook,0,0);
    var props = PropertiesService.getUserProperties();
    props.setProperty(newBook.iD, JSON.stringify(newBook)); //get back with JSON.parse()
    //props.setProperty("CurrentNotebook", newBook.iD); // this one messed me up
  }
}

function bandAidAdd()
{
  var x = new Notebook("GATK research", "GATK Research_Notebook", "GATK reserach with ACANETS", DriveApp.getRootFolder().getId(), "", "", "");
  x = makeNewNotebookTree(x, DriveApp.getRootFolder().getId());
  x = makeNewMasterNotebook(x, 0, 0);
  var p = PropertiesService.getUserProperties();
  p.setProperty(x.iD, JSON.stringify(x));
}
function deleteAllProperties()
{
  PropertiesService.getUserProperties().deleteAllProperties();
}

/***
 * Make an entry for every notebook
 */
function makeAllEntriesN()
{
  var props = PropertiesService.getUserProperties();
  var keys = props.getKeys();
  
  while(keys.length != 0)
  {
    var newKey = keys.pop();
    var debug = props.getProperty(newKey)
    Logger.log(newKey + ": " +debug);
    var bk = JSON.parse(debug);
    makeNewEntryN(bk);
  }
}

/***
 * Make an summary for each notebook
 */
function globAllSummariesN()
{
  var props = PropertiesService.getUserProperties();
  var keys = props.getKeys();
  
  while(keys.length != 0)
  {
    var bk = JSON.parse(props.getProperty(keys.pop()));
    Logger.log(JSON.stringify(bk) + "\n");
    globWeeklyEntriesN(bk);
  }
}

/***
 * Send summary emails for each notebook
 */
function sendAllTODON()
{
  var props = PropertiesService.getUserProperties();
  var keys = props.getKeys();
  
  var email = Session.getActiveUser().getEmail();
  var body = "TODO summary from notebooks: \n\n";
  
  while(keys.length != 0)
  {
    var bk = JSON.parse(props.getProperty(keys.pop()));
    var chunk = highlightTODON(bk);
    body = body.concat(chunk);
  }
  
  MailApp.sendEmail(email, 
                  "TODO summary", 
                  body);
}

/***
 * Make a new entry in the given notebook
 */
function makeNewEntryN(notebook) {
  //Create new file 
  var myDate = new Date();             
  var myDayString = myDate.getDate().toString();
  if(myDayString.length == 1) //make day always 2 chars wide
    myDayString = "0" + myDayString;       
                                                           //(v) fix 0 indexed month
  var dateString = myDate.getYear().toString() + "_" + (myDate.getMonth() + 1).toString() + "_" + myDayString;
  var doc = DocumentApp.create(dateString); //this is supposed to be fine.
  
  //Add a header
  doc.addHeader().appendParagraph(notebook.longName + "\n" + dateString);
  
  //Break here; examine the doc, there is nothing written.
  var x = DriveApp.getFolderById(notebook.rootFolderId).getName(); //DEBUG
  
  //move to notebook folder from root
  moveFile(DriveApp.getFileById(doc.getId()), DriveApp.getFolderById(notebook.rootFolderId));
}

/*****************************************************************************
 * Call on Friday nights to glob all of the previous week's notes into one file then archive
 */
function globWeeklyEntriesN(notebook){
  //get all the folders and files you need
  var masterNotebook = DriveApp.getFileById(notebook.masterNotebookId);
  var oldFolder = DriveApp.getFolderById(notebook.oldFolderId);
  var notebookFolder = DriveApp.getFolderById(notebook.rootFolderId);
  
  //find logs to glob
  var logsToGlob = [];
  var logs = notebookFolder.getFiles();
  while(logs.hasNext())
    logsToGlob.push(logs.next());
  
  ///Convert all of the googleDrive files into Google docs
  var masterNotebookDoc = DocumentApp.openById(masterNotebook.getId());
  var logDocs = [];
  for(var i = 0; i < logsToGlob.length; i++)
    logDocs.push(DocumentApp.openById(logsToGlob[i].getId()));
  logDocs = logDocs.reverse(); //Reverse to get it in alphanumerical order (yes it is jank)
  
  //add a new week section to master w/ summary title \u0026 details
  masterNotebookDoc.getBody().appendHorizontalRule();
  
  ///for each log file in Notebook
  for(var i = 0; i < logDocs.length; i++){
    
    //add a subsection to the master notebook
    var title = logDocs[i].getName() + ": " + extractHeading(logDocs[i].getBody(), 
                                                             DocumentApp.ParagraphHeading.TITLE, 
                                                             false,
                                                             true,
                                                             DocumentApp.ParagraphHeading.NORMAL);
    var dailyHeader = masterNotebookDoc.getBody().appendParagraph(title);
    dailyHeader.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    //sanitize daily log's headings to make appropriate subsections( assuming H1-<eH3, H2-<eH4 and H3-<eH3 )
    extractHeading(logDocs[i].getBody(),DocumentApp.ParagraphHeading.HEADING1, 
                                                             false,
                                                             true,
                                                             DocumentApp.ParagraphHeading.HEADING3);
    extractHeading(logDocs[i].getBody(),DocumentApp.ParagraphHeading.HEADING2, 
                                                             false,
                                                             true,
                                                             DocumentApp.ParagraphHeading.HEADING4);
    extractHeading(logDocs[i].getBody(),DocumentApp.ParagraphHeading.HEADING3, 
                                                             false,
                                                             true,
                                                             DocumentApp.ParagraphHeading.HEADING3);
    //copy entry contents to subsection
    concatDocs(masterNotebookDoc, logDocs[i]);
    
    //move all the old logs away
    moveFile(logsToGlob[i], oldFolder, notebookFolder);
  } // \\for each log
}

/****************************************************************************
 * Pulls every line containing TODO from all notebook entries and....
 * (sends an email?) in the morning detailing all of the todos..
 * pull from master notebook too
 */
function highlightTODON(notebook){
  var todoList = [];
  var masterTodos = [];
  
  //Exctract all paragraphs starting with TODO from current Notebook entries and whatever is in the master folder
  var searchDirs = [DriveApp.getFolderById(notebook.rootFolderId), DriveApp.getFolderById(notebook.masterFolderId)];
  //j = iterator for files in dir
  var j;
  for(var i = 0; i < searchDirs.length; i++){
    var entry = searchDirs[i];
    j = entry.searchFiles("");
    while(j.hasNext()) {
      var doc = DocumentApp.openById(j.next().getId());
      var currentBody = doc.getBody();
      var range = currentBody.findText("^TODO.*?$");
      
      while(range)
      {
        var myPar = range.getElement().asText().getText();
        todoList.push([doc.getName(), myPar]);
        range = currentBody.findText("^TODO.*?$", range);
        Logger.log("From " + doc.getName() + "... " + myPar);
      } // \\while searching all of j
    } // \\while each doc in entry
  }
  
  //compose them into an email if there is anything
  if(todoList.length == 0&& masterTodos.length == 0)
    return "";
  
  var bodyChunk = "Notebook --- " + notebook.longName + '\n';
  if(todoList.length > 0) {
    for(var i = 0; i < todoList.length; i++) {
      bodyChunk = bodyChunk.concat(todoList[i][0], ": ", todoList[i][1].replace("TODO", ""), "\n");
    }
  }
  
  if(masterTodos.length > 0) {    
    bodyChunk = bodyChunk.concat("\n----\n");
    for(var i = 0; i < masterTodos.length; i++) {
      bodyChunk = bodyChunk.concat("M: ", masterTodos[i].replace("TODO", ""), "\n");
    }
  }
  
  bodyChunk = bodyChunk.concat("\n\n");  
  return bodyChunk;
}





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////Below be tests//////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////




/* tests all of the functions with an N postfix 
 * I'm lazy, so I'm commenting in/out lines as I want them and lookinga t object values in the debugger.*/
function test_notebookSuite()
{
  //make test notebook structure n.                                  // V V V TODO, fill with auto values if it is already generated, make the next 2 lines conditional
  var n = new Notebook(1, "test_Book", "Things for the test folder", 0, 0, 0, 0);
  n = makeNewNotebookTree(n, DriveApp.getRootFolder().getId()); //pass
  n = makeNewMasterNotebook(n, 0, "Testamungous"); //pass (didn't test image yet)
  
  makeNewEntryN(n); //pass
  makeNewSummaryN(n); //pass
  highlightTODON(n); //pass (Enough)
  globWeeklyEntriesN(n);
  
}

//ez pass first time
function testMoveFile()
{
  var fold1 = DriveApp.createFolder("fold1");
  var fold2 = DriveApp.createFolder("fold2");
  var file1 = DriveApp.createFile("file1", "test for moveFile");
  var file2 = DriveApp.createFile("file2", "test for moveFile");
  
  moveFile(file1, fold1);
  moveFile(file2, fold2);
  
  try{
    moveFile(0, fold2, fold1);
  } catch(err) {
    Logger.log("Expected Err: " + err);
  }
  
  try{
    moveFile(file1, 0, fold1);
  } catch(err) {
    Logger.log("Expected Err: " + err);
  }
  
  moveFile(file1, fold2, fold1);
  moveFile(file2, fold1, fold2);
}

//pass
//  It doesn't do list items quiiiiiite perfectly, but its close enough for me bc i don't need fancy dots in something i'll read twice
function test_ConcatDocs()
{
  var c_base = DocumentApp.openById(DriveApp.getFilesByName("Concat Base").next().getId());
  var c_next =  DocumentApp.openById(DriveApp.getFilesByName("Concat Test").next().getId());
  
  concatDocs(c_base, c_next);
  
}
//pass
function test_MakeNewMasterNotebook()
{
  var d = new Date(); 
  
  /*Make one in root*/
  var root = DriveApp.getRootFolder();
  var nameRoot = "ATestNotebookInRoot" + d.getMilliseconds();
  var noteBlob = makeNewNotebookTree(nameRoot);

  makeNewMasterNotebook(noteBlob["master"], nameRoot, "Something about Will Smith but I can't remember who he is", 0, "Jayden Smith");
  
  /*Make one in a folder*/
  var nameOther = "ATestNotebookInOther" + d.getMilliseconds() + "_" + d.getMilliseconds();
  var fol1 = root.createFolder(nameOther);
  var noteBlob2 = makeNewNotebookTree(nameOther + nameRoot, fol1);
  
  makeNewMasterNotebook(noteBlob2["master"], nameOther, "less puns mo code");
}

//pass
function test_ExtractHeading()
{
  var doc = DocumentApp.openById(DriveApp.getFilesByName('Test_Doc').next().getId());
  var body = doc.getBody();
  
  Logger.log("Extract one Title, no replace");
  var title = extractHeading(body,DocumentApp.ParagraphHeading.HEADING1,0,0, false);
  Logger.log(title);
  
  Logger.log("Extract all normals, replace with h2");
  var h2 = extractHeading(body, DocumentApp.ParagraphHeading.NORMAL, true, true, DocumentApp.ParagraphHeading.HEADING2);
  Logger.log(h2.length);
  
  Logger.log("return first H2s, replace with title");
  var firstH2 = extractHeading(body, DocumentApp.ParagraphHeading.HEADING2, false, true, DocumentApp.ParagraphHeading.HEADING1);
  Logger.log(firstH2);
  
  Logger.log("Using all default arguments");
  var title = extractHeading(body);
  Logger.log(title);
}

//pass
function test_ExtractTitle()
{
  var doc = DocumentApp.openById(DriveApp.getFilesByName('Test_Doc').next().getId());
  
  var body = doc.getBody();
  
  var title = extractTitle(body);
  
  Logger.log(title);
}