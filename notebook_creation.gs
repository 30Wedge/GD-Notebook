//TODO I also should keep old summaries and make some way so that master can be regenerated completely from the Old folder

/*****************************************************************************
 * Add a new notebook to this drive (only works as add-on)
 */ 
function addNewNotebook()
{
  var ui = DocumentApp.getUi();
  ui.alert("To create a notebook, we're going to need the following settings:\n" +
           " + short title \n" +
           " + long title (Optional. Default is to copy the short title's value over) \n" +
           " + pick the directory to create your notebook in. (not implemented, just creates in root rn.)\n" +
           " + pick a cover image (upload, select existing image, or leave it blank) \n");
           
  var shortName = ui.prompt("Enter short name of your notebook", ui.ButtonSet.OK);
  var longName = ui.prompt("Enter long name of your notebook (Optional)", ui.ButtonSet.OK_CANCEL);
  //pick a directory one day?
  //pick an image one day .. too complicated now and I'm too lazy.
  
  var newBook = new Notebook(longName, shortName, longName, DriveApp.getRootFolder().getId(), "", "", "");
  
  newBook = makeNewNotebookTree(newBook);
  newBook = makeNewMasterNotebook(newBook,0,0);
  //save for later
  var props = PropertiesService.getUserProperties();
  props.setProperty(newBook.iD, JSON.stringify(newBook)); 
  props.setProperty("CurrentNotebook", newBook.iD);
  //TODO need to store notebooks in a list of notebooks
  //TODO make a function to add a notebook to the list
  //
}
/*****************************************************************************
 * Notebook object constructor
 */
function Notebook(iD, shortName, longName, rootFolderId, masterNotebookId, oldFolderId, masterFolderId)
{
  this.iD = iD;
  this.shortName = shortName;
  this.longName = longName;
  this.rootFolderId = rootFolderId;
  this.oldFolderId = oldFolderId;
  this.masterFolderId = masterFolderId;
  this.masterNotebookId = masterNotebookId;
}
/*****************************************************************************
 * Creates a new notebook tree structure and returns the root folder
 * tested
 */
function makeNewNotebookTree(notebook, folderIdToMakeItInID) {
  //validate
  notebook.shortName =  notebook.shortName || "Notebook";
  folderIdToMakeItInID =  folderIdToMakeItInID ||  DriveApp.getRootFolder().getId();
  
  var inFolder = DriveApp.getFolderById(folderIdToMakeItInID);
  //Create new folder structure
  //root
  // |--<enotebookName
  //      |--<eOldentries
  //      |--<enotebookName_Master
  
  //if rootfolder exists. set notebook fields *grossly unsafely* and bail
  /*var fldrs = rootFolder.searchFolders(notebook.shortName); //I'm still having issues with search queries
  if(fldrs.hasNext())
  {
    var notebookFolder = fldrs.next();
    var conts = notebookFolders.getFolders();
    
    notebook.oldFolderId = conts.next().getId();
    notebook.masterFolderId = conts.next().getId();
    
    return notebook;
  } */
  
  //otherwise make it on the fly, solidly.
  var notebookFolder = inFolder.createFolder(notebook.shortName);
  var oldFolder = notebookFolder.createFolder("Old Entries");
  var masterFolder = notebookFolder.createFolder(notebook.shortName + "_Master");
  
  notebook.rootFolderId = notebookFolder.getId();
  notebook.oldFolderId = oldFolder.getId();
  notebook.masterFolderId = masterFolder.getId();
  
  return notebook;
}

/*****************************************************************************
 * Creates a new master entry from notebook object, + image file ID + optional author name. 
 *
 * Updates notebook object with masterNotebookId.
 * 
 * and return the updated notebook object
 * TODO make sure the image option works.
 */
function makeNewMasterNotebook(notebook, imageFileID,  humanName) {
  //validate
  notebook.shortName = notebook.shortName || "Notebook";
  notebook.longName = notebook.longName || notebook.shortName || "Notebook";
    //image can be nothing
  humanName = humanName || Session.getActiveUser().getEmail();
  
  var masterFolder = DriveApp.getFolderById(notebook.masterFolderId);
  Logger.log(masterFolder);
  
  var mDoc = DocumentApp.create(notebook.shortName);
  notebook.masterNotebookId = mDoc.getId();
  var docFile = DriveApp.getFileById(notebook.masterNotebookId );
  
  moveFile(docFile, masterFolder, DriveApp.getRootFolder());
  
  var title = mDoc.getBody().appendParagraph(notebook.longName);
  title.setHeading(DocumentApp.ParagraphHeading.TITLE);
  
  var subtitle = mDoc.getBody().appendParagraph("by: " + humanName);
  subtitle.setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
  
  if(imageFileID)
  {
    var blob = DriveApp.getFileById(imageFileID).getBlob();
    mDoc.getBody().appendImage(blob);
  }
  
  return notebook; 
}