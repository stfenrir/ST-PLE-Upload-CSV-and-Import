/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/email', 'N/runtime', 'N/task', 'N/file', 'N/log'],
    function (search, record, email, runtime, task, file, log) {
        var TO_PROCESS_FOLDER = parseInt(runtime.getCurrentScript().getParameter("custscript_to_processed_folder"));
        var PROCESSED_FOLDER = parseInt(runtime.getCurrentScript().getParameter("custscript_processed_folder"));

        var ERROR_FOLDER = parseInt(runtime.getCurrentScript().getParameter("custscript_ref_error_au_folder"));

        var CSV_MAPPING_ID = parseInt(runtime.getCurrentScript().getParameter("custscript_csv_map_id"));

        function execute(context) {
            processFile(context);
        }

        function checkIfExist(obj, processedFolder) {
            var fileExist = false;
            var oldName = obj.fileName.substring(0, obj.fileName.length - 4)

            var folderSearchObj = search.create({
                type: "folder",
                filters:
                    [
                        ["file.name", "is", oldName],
                        "OR",
                        ["file.name", "is", obj.fileName],
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC,
                            label: "Name"
                        }),
                        search.createColumn({
                            name: "foldersize",
                            label: "Size (KB)"
                        }),
                        search.createColumn({
                            name: "lastmodifieddate",
                            label: "Last Modified"
                        }),
                        search.createColumn({
                            name: "parent",
                            label: "Sub of"
                        }),
                        search.createColumn({
                            name: "numfiles",
                            label: "# of Files"
                        })
                    ]
            });
            var searchResultCount = folderSearchObj.runPaged().count;
            log.debug('searchResultCount', searchResultCount)
            if (searchResultCount > 0) {
                fileExist = true;
            } else {
                fileExist = false;
            }
            return fileExist;
        }

        function moveFolder(context, obj) {
            try {
            //     var fileExist = checkIfExist(obj, PROCESSED_FOLDER);
            //     log.debug('fileExist', fileExist)
            //     if (!fileExist) {
            //         var fileObj = file.load({
            //             id: obj.fileId
            //         });
			//
            //         fileObj.folder = PROCESSED_FOLDER;
            //         var idf = fileObj.save();
            //         log.debug('movefolder..+aftersave movefolder if filenotexist=' + idf);
            //     } else {
                    var fileObj = file.load({
                        id: obj.fileId
                    });
                    var oldName = obj.fileName.substring(0, obj.fileName.length - 4)
                    fileObj.name = oldName +'-'+ Date.now() + '.csv';
                    log.debug('fileObj.name', fileObj.name)
                    fileObj.folder = PROCESSED_FOLDER;
                    var idf = fileObj.save();
                    log.debug('movefolder..+aftersave new id=' + idf);
                    log.debug('obj.fileId..+aftersave- idf new id=' + obj.fileId);

               // }
            } catch (e) {
                log.error('error Moving to Processed Folder' + e.message);
            }

        }

        function processFile(context) {
            var fileList = new Array();
            var folderSearchObj = search.create({
                type: "folder",
                filters:
                    [
                        ["internalid", "anyof", TO_PROCESS_FOLDER]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            join: "file",
                            label: "Internal ID"
                        }),

                        search.createColumn({
                            name: "name",
                            join: "file",
                            label: "Name"
                        })
                    ]
            });
            var searchResultCount = folderSearchObj.runPaged().count;
            log.debug("folderSearchObj result count" + searchResultCount);

            folderSearchObj.run().each(function (result) {
                var obj = new Object();
                // .run().each has a limit of 4,000 results
                var fileId = result.getValue({
                    name: 'internalid',
                    join: "file"
                });
                var fileName = result.getValue({
                    name: 'name',
                    join: "file"
                });

                if (fileId) {
                    obj.fileId = parseInt(fileId);
                    obj.fileName = fileName;
                    fileList.push(obj);
                }

                log.debug(" fileId" + fileId);
                //if (fileId)

                return true;
            });

            var recCreated = false;
            for (var len = 0; len < fileList.length; len++) {
                recCreated = createTask(context, fileList[len]);
                  if (recCreated){
                moveFolder(context, fileList[len]);
                }
            }

        }

        function createTask(context, obj) {
            log.debug(" createTask fileId" + obj.fileId);
            log.debug(" createTask filename" + obj.fileName);

            var fileObj = file.load({
                id: obj.fileId
            });
            try {
                var csv = task.create({
                    taskType: task.TaskType.CSV_IMPORT,
                    mappingId: CSV_MAPPING_ID,
                    importFile: fileObj
                })
                csv.name = obj.fileName;
                csv.submit();
            } catch (e) {
                log.debug(" CSV_MAPPING_ID " + CSV_MAPPING_ID);
                log.error('Email sent : ' + obj.fileName, e.message);
                email.send({
                    author: -5,
                    recipients: 2746,
                    subject: 'Error processing CSV Import',
                    body: 'The scheduling of a CSV Import has had an error with File : ' + obj.fileName + '. Please check the file.\n' + e.message,
                })



            }


            return true;

        }

        return {
            execute: execute
        };
    });
