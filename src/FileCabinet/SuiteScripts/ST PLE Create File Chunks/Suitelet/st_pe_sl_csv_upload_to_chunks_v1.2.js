
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
        const CSV_FOLDER = 15900;
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

                    var messageField = form.addField({
                        id: 'custpage_message',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Message'
                    });

                    messageField.defaultValue = `<h1>Please Upload a CSV File</h1>`;

                    fileField.container = CSV_FOLDER;

                    // Add a submit button
                    form.addSubmitButton({
                        label: 'Submit File'
                    });

                    scriptContext.response.writePage(form);

                } else if (scriptContext.request.method === 'POST') {
                    displayMessage(`Trying to save the CSV file on FileCabinet`,scriptContext);

                    //const CHUNK_SIZE = runtime.getCurrentScript().getParameter({name: 'custscript_number_of_rows'});;
                    const CHUNK_SIZE = 29999;
                    log.audit('Max Number of Rows: ' + CHUNK_SIZE)

                    // Retrieve the uploaded file
                    let uploadedFile = scriptContext.request.files.custpage_file_upload;
                    log.debug(`UploadedFile size ${uploadedFile.size}`)

                    // Use method to get an iterator for each line of the loaded file
                    const lineIterator = uploadedFile.lines.iterator();
                    let header = null;
                    let rows = [];
                    let chunks = [];
                    let timestamp = new Date().getTime();
                    log.debug('timestamp', timestamp);
                    lineIterator.each(function (line) {
                        if (!header) {
                            // This is the first line, which is the header
                            header = line.value;
                            log.debug('Headers', header);
                        } else {
                            // When the header is already acquired, each line will be pushed to the rows array
                            rows.push(line.value);
                            // When the rows array is equal to the CHUNK_SIZE, attach the header to the rows array and push it to the chunks array.
                            if (rows.length === CHUNK_SIZE) {
                                const chunk = [header, ...rows].join('\n');
                                chunks.push(chunk);
                                rows = [];
                            }
                        }
                        return true;
                    });

                    // For the remaining lines that did not achieve the number of specified CHUNK_SIZE, take all those and attach the header and push it to the chunks array
                    if (header !== null && rows.length > 0) {
                        const chunk = [header, ...rows].join('\n');
                        chunks.push(chunk);
                    }
                    log.debug(`Chunk length ${chunks.length}`)
                    for (let i = 0; i < chunks.length; i++) {
                        var fileName = `chunked_csv_file_number_${i + 1}`;
                        // Use file.create to get the file ID
                        let newFile = file.create({
                            name: fileName,
                            fileType: file.Type.CSV,
                            contents: chunks[i],
                            folder: CSV_FOLDER
                        });

                        let fileId = newFile.save()
                        log.debug(`File is Saved ${fileId}`)
                    }

                    /*


                    const header = strFileContent.shift();
                    const rows = strFileContent.split('\n');
                    let timestamp = new Date().getTime();
                    var counter = 0;

                    // Process data in chunks
                    for (var i = 0; i < rows.length; i += CHUNK_SIZE) {
                        counter++
                        //Slice row into 29999
                        const chunk = rows.slice(i, i + CHUNK_SIZE).join('\n');
                        var fileName = `chunked_csv_file_${counter}_${timestamp}`;

                        let contents = header + '\n' + chunk;

                        // Use file.create to get the file ID
                        let newFile = file.create({
                            name: fileName,
                            fileType: file.Type.CSV,
                            contents: contents,
                            folder: CSV_FOLDER
                        });

                        let fileId = newFile.save();
                        log.debug(`File Uploaded ${fileId}`)

                    }

                     */

                    // Create a Scheduled Script task
                    let scheduledScriptId = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT,
                        scriptId: SCHEDULED_SCRIPT,
                    }).submit();

                    log.debug(`Scheduled Script Scheduled. Task ID: ${scheduledScriptId}`);
                    let taskStatus = task.checkStatus(scheduledScriptId);
                    // Display message with Scheduled Script Scheduled status
                    displayMessage(`Scheduled Script is Executed. Status: ${taskStatus.status}`,scriptContext);


                }
            } catch (e) {
                log.error(`Error Message `, e);
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
