
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/ui/serverWidget', 'N/file', 'N/task'],
    /**
     * @param{runtime} runtime
     * @param{serverWidget} serverWidget
     * @param{file} file
     * @param{task} task
     */
    (runtime, serverWidget, file, task) => {
        const CSV_FOLDER = 56771;
        const MAP_REDUCE_SCRIPT = 'customscript_st_mr_create_file_chunks';
        const SCHEDULED_SCRIPT = 'customscript_st_trigger_csv_import';

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            try {
                if (scriptContext.request.method === 'GET') {
                    var form = serverWidget.createForm({
                        title: 'Upload Large CSV file to create smaller CSV files',
                        hideNavBar: false
                    });

                    // Add a file upload field
                    var fileField = form.addField({
                        id: 'custpage_file_upload',
                        type: serverWidget.FieldType.FILE,
                        label: 'Upload CSV File'
                    });

                    fileField.container = CSV_FOLDER;

                    // Add a submit button
                    form.addSubmitButton({
                        label: 'Submit File'
                    });

                    scriptContext.response.writePage(form);

                } else if (scriptContext.request.method === 'POST') {

                    // Retrieve the uploaded file
                    let uploadedFile = scriptContext.request.files.custpage_file_upload;
                    log.debug(`UploadedFile ${uploadedFile}`)

                    let timestamp = new Date().getTime();

                    // Use file.create to get the file ID
                    let newFile = file.create({
                        name: `CSV_FILE_TO_PROCESS_${timestamp}.csv`,
                        fileType: file.Type.CSV,
                        contents: uploadedFile.getContents(),
                        folder: CSV_FOLDER
                    });

                    let fileId = newFile.save();
                    log.debug(`File Uploaded ${fileId}`)

                    // Create a map/reduce task
                    let mapReduceTaskId = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: MAP_REDUCE_SCRIPT,
                        params: {
                            'custscript_st_mr_csv_to_import': fileId,
                        }
                    }).submit();

                    log.debug(`Map/Reduce Task Submitted. Task ID: ${mapReduceTaskId}`);
                    displayMessage('Map Reduce Script is Executed. Status Check in Progress...',scriptContext );

                    wait(70000)

                    displayMessage('Trying to trigger file Import...',scriptContext );

                    // Schedule the second script after the completion of the first task
                    scheduleSecondScript(mapReduceTaskId,scriptContext);


                }
            } catch (e) {
                log.error(`Error Message ${e}`);
            }
        };

        const wait = (ms) => {
            const date = Date.now();
            let currentDate = null;
            do {
                currentDate = Date.now();
            } while (currentDate - date < ms);
        }

        const scheduleSecondScript = (mrTask,scriptContext ) => {
            try {
                // Check the status of the first map/reduce task
                let taskStatus = task.checkStatus(mrTask);
                log.debug(`MR TaskStatus ${taskStatus}`);

                // If the task is completed successfully, schedule the second script
                //if (taskStatus.status === task.TaskStatus.COMPLETED) {
                    let secondScriptTaskId = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT,
                        scriptId: SCHEDULED_SCRIPT,
                    }).submit();

                    log.debug(`Second Script Scheduled. Task ID: ${secondScriptTaskId}`);
                // Display message with Map/Reduce status
                displayMessage(`Scheduled Script is Executed. Status: ${taskStatus.status}`,scriptContext);

            } catch (e) {

                log.error(`Error ${e}`)

            }
        };

        const displayMessage = (message, scriptContext ) => {
            var form = serverWidget.createForm({
                title: 'Map Reduce Status',
                hideNavBar: false
            });

            var messageField = form.addField({
                id: 'custpage_message',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Message'
            });

            messageField.defaultValue = `<h1>${message}</h1>`;

            scriptContext.response.writePage(form);
        };

        return { onRequest };
    });
