/*****************************************************************************
 * Creates a new daily notebook entry
 */
function makeNewEntry() {
  //Create new file 
  var myDate = new Date();             
  var myDayString = myDate.getDate().toString();
  if(myDayString.length == 1) //make day always 2 chars wide
    myDayString = "0" + myDayString;                      //fix 0 indexed month
  var dateString = myDate.getYear().toString() + "_" + (myDate.getMonth() + 1).toString() + "_" + myDayString;
  var doc = DocumentApp.create(dateString);
  
  //Add a header
  doc.addHeader().appendParagraph("Andy MacGregor's notebook at Valeo\n"
                                 + dateString);
  
  var ntbkFolder;
  var fldrs = DriveApp.getFolders();
  
  while(fldrs.hasNext()){ //asking for trouble
    ntbkFolder = fldrs.next();
    if(ntbkFolder.getName() == "Notebook")
      break;
  }
  
  //move to notebook folder from root
  moveFile(DriveApp.getFileById(doc.getId()), ntbkFolder); 
}

/*
 * Creates a new glob summary entry
 */
function makeNewSummary() {
  //Create new file 
  var myDate = new Date();                                                 //fix 0 indexed month
  var title = "Summary of week of " + myDate.getYear().toString() + "_" + (myDate.getMonth() + 1).toString() + "_" + myDate.getDate().toString();
  var doc = DocumentApp.create(title);
  
  //create document content
  doc.getBody().appendParagraph("#Insert a brief,detailed description of this week's work where indicated.\n" +
                                "#Lines starting with '#' will be ignored.\n" +
                                "#The first non-comment line is interpreted as your title:\n" +
                                "Replace this with your title:\n" + 
                                "#Everything else in the file is interpreted as a description\n" +
                                "#Insert Description here \n");
  
  var ntbkfold;
  var ntbks = DriveApp.searchFolders("title contains Notebook");
  if(ntbks.hasNext()){
    ntbkfold == ntbks.next();
  } else {
    throw "Notebook folder not found";
  }
    
  //move from root to notebook file
  moveFile(DriveApp.getFileById(doc.getId()), ntbkfold);

}

/*****************************************************************************
 * Call on Friday nights to glob all of the previous week's notes into one file then archive
 */
function globWeeklyEntries(){
  var masterNotebook;
  var masterNotebookDoc;
  var oldFolder;
  var notebookFolder;
  var summaryFile;
  var summaryFileDoc;
  var logDocs;
  var toc; //table of contents
  //manipulate GDrive to find the master file, old folder, weekly summary, and logs to glob
  
  //open the file in master
  if(DriveApp.getFilesByName("Notebook_Master").hasNext()){
    masterNotebook = DriveApp.getFilesByName("Notebook_Master").next();
  } else {
    masterNotebook = DriveApp.createFile("Notebook_Master", "", MimeType.GOOGLE_DOCS);
  }
  
  //open old folder
  if(DriveApp.getFoldersByName("Notebook_OldEntries").hasNext()){
    oldFolder = DriveApp.getFoldersByName("Notebook_OldEntries").next();
  } else {
    //create a new old folder and move it to Notebook. (no error checking involved)
    oldFolder = DriveApp.createFolder("Notebook_OldEntries");
    DriveApp.getFoldersByName("Notebook").next().addFolder(oldFolder);
    DriveApp.getRootFolder().removeFolder(oldFolder);
  }
  
  if(DriveApp.getFoldersByName("Notebook").hasNext())
    notebookFolder = DriveApp.getFoldersByName("Notebook").next();
  
  ///open weekly summary
  var searchResults = DriveApp.searchFiles("title contains 'Summary'");
  //! Here's where its tricky, because searchResults can return an 'empty object'
  if(searchResults.hasNext()){ 
    summaryFile = searchResults.next();
  } else {
    //no summary: no blob by removing summary
    console.log("No summary found so blob abborted\n");
    return 1;
  }
  
  //find logs to glob
  var logsToGlob = [];
  var logs = notebookFolder.searchFiles("not (title contains 'Summary')");
  while(logs.hasNext())
    logsToGlob.push(logs.next());
  
  ///Convert all of the googleDrive files into Google docs
  masterNotebookDoc = DocumentApp.openById(masterNotebook.getId());
  summaryFileDoc = DocumentApp.openById(summaryFile.getId());
  logDocs = [];
  for(var i = 0; i < logsToGlob.length; i++)
    logDocs.push(DocumentApp.openById(logsToGlob[i].getId()));
  logDocs = logDocs.reverse(); //Reverse to get it in alphabetical order (may change)
  
  //get master toc // and do nothing with it
  var findTocResult = masterNotebookDoc.getBody().findElement(DocumentApp.ElementType.TABLE_OF_CONTENTS);
  if(findTocResult)
    toc = findTocResult.getElement().asTableOfContents();
  
  ///skim weekly summary for title and description
  var summaryContents = summaryFileDoc.getBody().getText();
  var cleanSummaryContents = "";
  
  //clean comment lines of summary \u0026 extract title
  var summaryLines = summaryContents.split("\n");
  var summaryTitle = "";
  for(var i = 0; i < summaryLines.length; i++){
    if(summaryLines[i].charAt(0) == "#"){
      continue;
    } else {
      summaryLines[i].replace("\
", " ");
      //set the first non-comment line to the title
      if(!summaryTitle) {
        summaryTitle = summaryLines[i];
      } else {
        cleanSummaryContents = cleanSummaryContents + (summaryLines[i] + "\
");
      }
    }
  }
  
  //add a new week section to master w/ summary title \u0026 details
  masterNotebookDoc.getBody().appendHorizontalRule();
  
  var weeklyHeader = masterNotebookDoc.getBody().appendParagraph(summaryFile.getName() + ": " + summaryTitle);
  weeklyHeader.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  
  masterNotebookDoc.getBody().appendParagraph(cleanSummaryContents);
  
  ///for each log file in Notebook
  for(var i = 0; i < logDocs.length; i++){
    
    //add a subsection to the master notebook
    var title = logDocs[i].getName() + ": " + extractHeading(logDocs[i].getBody(), 
                                                             DocumentApp.ParagraphHeading.TITLE, 
                                                             false,
                                                             true,
                                                             DocumentApp.ParagraphHeading.NORMAL);
    var dailyHeader = masterNotebookDoc.getBody().appendParagraph(title);
    dailyHeader.setHeading(DocumentApp.ParagraphHeading.HEADING3);
    
    //sanitize daily log's headings to make appropriate subsections( assuming H1-<eH4, H2-<eH5 and H3-<eH4 )
    extractHeading(logDocs[i].getBody(),DocumentApp.ParagraphHeading.HEADING1, 
                                                             false,
                                                             true,
                                                             DocumentApp.ParagraphHeading.HEADING4);
    extractHeading(logDocs[i].getBody(),DocumentApp.ParagraphHeading.HEADING2, 
                                                             false,
                                                             true,
                                                             DocumentApp.ParagraphHeading.HEADING5);
    extractHeading(logDocs[i].getBody(),DocumentApp.ParagraphHeading.HEADING3, 
                                                             false,
                                                             true,
                                                             DocumentApp.ParagraphHeading.HEADING4);
    //copy entry contents to subsection
    concatDocs(masterNotebookDoc, logDocs[i]);
  } // \\for each log
  
  //move all the old logs away
  for(var i = 0; i < logsToGlob.length; i++)
  {
    oldFolder.addFile(logsToGlob[i]);
    notebookFolder.removeFile(logsToGlob[i]);
  }
  
  //delete the summary file to prevent an extra glob
  notebookFolder.removeFile(summaryFile);
  
  /*
  * When Google updates their API
  * refresh the table of contents here
  */ 
}


/****************************************************************************
 * Pulls every line containing TODO from all notebook entries and....
 * (sends an email?) in the morning detailing all of the todos..
 * pull from master notebook too
 */
function highlightTODO(){
  var todoList = [];
  var masterTodos = [];
  var email = Session.getActiveUser().getEmail();
  
  //Exctract all paragraphs starting with TODO from current Notebook entries
  var i = DriveApp.getFoldersByName("Notebook");
  var j;
  while(i.hasNext())
  {
    var entry = i.next();
    j = entry.searchFiles("");
    while(j.hasNext())
    {
      var doc = DocumentApp.openById(j.next().getId());
      var currentBody = doc.getBody();
      var range = currentBody.findText("^TODO.*?$");
      
      while(range)
      {
        var myPar = range.getElement().asText().getText();
        todoList.push([doc.getName(), myPar]);
        range = currentBody.findText("^TODO.*?$", range);
        Logger.log("From " + doc.getName() + "... " + myPar);
      }
    }
  }
  
  //now scrape the master notebook
  i = DriveApp.getFoldersByName("Notebook_Master");
  while(i.hasNext())
  {
    var noteBook = i.next();
    j = noteBook.searchFiles("");
    while(j.hasNext())
    {
      var file = j.next();
      var currentBody = DocumentApp.openById(file.getId()).getBody();
      var range = currentBody.findText("^TODO.*?$");
      
      while(range)
      {
        var myPar = range.getElement().asText().getText();
        masterTodos.push(myPar);
        range = currentBody.findText("^TODO.*?$", range);
        Logger.log("From master..." + myPar);
      }
    }
  }
  
  //compose them into an email if there is anything
  if(todoList.length == 0 && masterTodos.length == 0)
    return;
  var mailBody = "Daily TODO list from notebook: \n\n";
  if(todoList.length <=0) {
    for(var i = 0; i < todoList.length; i++) {
      mailBody = mailBody.concat(todoList[i][0], ": ", todoList[i][1].replace("TODO", ""), "\
");
    }
  }
  
  if(masterTodos.length < 0) {    
    mailBody = mailBody.concat("\n----\n");
    for(var i = 0; i < masterTodos.length; i++) {
      mailBody = mailBody.concat("M: ", masterTodos[i].replace("TODO", ""), "\n");
    }
  }
  
  mailBody = mailBody.concat("\n\n-Sent automatically from Notebook\n");
  
  MailApp.sendEmail(email, 
                    "TODO summary", 
                    mailBody);
}

/****************** Helpers **********************/

/*
 * Does exactly what it says it does
 * If source isn't specified, assumes its from root (this might not be the best idea because multiple folders can own a file)
 * should be in GDrive File/Folder types
 */
function moveFile(file, destFolder, sourceFolder){
  if(!file || ! destFolder)
    throw "fileName or destFolder not specified";
  sourceFolder = sourceFolder || DriveApp.getRootFolder();
  
  destFolder.addFile(file);
  sourceFolder.removeFile(file);
}

/*
 * Searches the body for any title sections
 * Removes all titles and returns the first found
 */
function extractTitle(body) {
  var firstTitle = "";
  
  var rElement = body.findElement(DocumentApp.ElementType.PARAGRAPH)
  var par;
  
  //while there are more paragraphs to find
  while(rElement)
  {
    par = rElement.getElement().asParagraph();
    //is this paragraph a title?
    if(par.getHeading() == DocumentApp.ParagraphHeading.TITLE)
    {
      //if the title isn't already set
      if(!firstTitle)
      {
        firstTitle = par.getText()
      }
      par.setHeading(DocumentApp.ParagraphHeading.NORMAL);
    }
    
    //find the next in line
    rElement = body.findElement(DocumentApp.ElementType.PARAGRAPH, rElement);
  }
  
  return firstTitle;
}

function extractHeading(body, headingTypeFind, returnAllOccurances, replaceOccurances, headingTypeReplace) {
  //default parameter hack
  headingTypeFind = headingTypeFind || DocumentApp.ParagraphHeading.HEADING1;
  returnAllOccurances = returnAllOccurances || false;
  replaceOccurances = replaceOccurances || true;
  headingTypeReplace = headingTypeReplace || DocumentApp.ParagraphHeading.NORMAL;
  //\\default parameters
  
  var firstTitle = "";
  var headingList = [];
  
  var rElement = body.findElement(DocumentApp.ElementType.PARAGRAPH)
  var par;
  
  //while there are more paragraphs to find
  while(rElement){
    par = rElement.getElement().asParagraph();
    //is this paragraph a target heading?
    if(par.getHeading() == headingTypeFind){
      //adds this heading to the collection
      headingList.push(par.getText());
      
      //if firstTitle isn't already found
      if(!firstTitle){
        firstTitle = par.getText()
      }
      
      //replace if asked for
      if(replaceOccurances){
        par.setHeading(headingTypeReplace);
      }
    }    
    //find the next in line
    rElement = body.findElement(DocumentApp.ElementType.PARAGRAPH, rElement);
  }
  
  //returns what was asked for
  if(returnAllOccurances){
    return headingList;
  } else {
    return firstTitle;
  }
}

/* Takes two documents
 * - Copies the contents of nextDoc
 * - Appends them on to baseDoc
 *
 * !!!!This is Copy-pasta from stack overflow https://stackoverflow.com/questions/10692669/how-can-i-generate-a-multipage-text-document-from-a-single-page-template-in-goog
 */
function concatDocs(baseDoc, nextDoc)
{
    var body = baseDoc.getBody();
    var otherBody = nextDoc.getBody();
  
    var totalElements = otherBody.getNumChildren();
    for( var j = 0; j < totalElements; ++j ) {
      var element = otherBody.getChild(j).copy();
      var type = element.getType();
      if( type == DocumentApp.ElementType.PARAGRAPH )
        body.appendParagraph(element);
      else if( type == DocumentApp.ElementType.TABLE )
        body.appendTable(element);
      else if( type == DocumentApp.ElementType.LIST_ITEM )
        body.appendListItem(element);
      else if( type == DocumentApp.ElementType.INLINE_IMAGE )
        body.appendImage(element);
      else if( type == DocumentApp.ElementType.PAGE_BREAK )
        body.appendPageBreak(element);
      else if( type == DocumentApp.ElementType.INLINE_DRAWING ) //maybbe this works? --more copy-pasta
      {
        var drawing = element.asParagraph().copy();
        body.appendParagraph(drawing);
      }
      else
        throw new Error("According to the doc this type couldn't appear in the body: "+type);
    }
   
}