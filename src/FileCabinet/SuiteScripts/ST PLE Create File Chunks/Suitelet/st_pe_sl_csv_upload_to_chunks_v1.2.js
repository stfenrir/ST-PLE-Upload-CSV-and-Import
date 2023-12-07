
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
                const ACCOUNT_ID = runtime.accountId;
                log.debug(`Account ID ${ACCOUNT_ID}`)
                const SANDBOX_ID = '7309664_SB1'
                let jobStatusPage = ACCOUNT_ID === SANDBOX_ID ? 'https://7309664-sb1.app.netsuite.com/app/setup/upload/csv/csvstatus.nl?whence=' : 'https://7309664.app.netsuite.com/app/setup/upload/csv/csvstatus.nl?whence=';
                if (scriptContext.request.method === 'GET') {

                    let form = serverWidget.createForm({
                        title: 'Upload CSV to Import',
                        hideNavBar: false
                    });

                    // Add a file upload field
                    let fileField = form.addField({
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

                    let uploadedFile = scriptContext.request.files.custpage_file_upload;
                    log.debug(`UploadedFile size ${uploadedFile.size}`)

                    var postForm = serverWidget.createForm({
                        title: 'Upload Status',
                        hideNavBar: false
                    });

                    var messageField = postForm.addField({
                        id: 'custpage_message',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Message'
                    });
                    messageField.defaultValue = `<h1>Script is executed</h1>`;

                    // Process the file and handle promises
                    processFile(uploadedFile)
                        .then((result) => {
                            let scheduledScriptId = task.create({
                                taskType: task.TaskType.SCHEDULED_SCRIPT,
                                scriptId: SCHEDULED_SCRIPT,
                            }).submit();

                            log.debug(`Scheduled Script Scheduled. Task ID: ${scheduledScriptId}`);

                            displayMessage(`CSV import has started. Please go to <a href="${jobStatusPage}">Job Status</a> to monitor the csv import.`, scriptContext);

                        })
                        .catch((error) => {
                            displayMessage(error.message, scriptContext);
                        });

                    scriptContext.response.writePage(postForm);
                }

            } catch (e) {
                log.error(`Error Message `, e);
            }
        };

        const processFile = (uploadedFile) => {

            const CHUNK_SIZE = runtime.getCurrentScript().getParameter({name: 'custscript_number_of_rows_for_csv'});
            log.audit('Max Number of Rows: ' + CHUNK_SIZE)

            return new Promise((resolve, reject) => {
                const lineIterator = uploadedFile.lines.iterator();
                let header = null;
                let rows = [];
                let chunks = [];

                lineIterator.each(function (line) {
                    if (!header) {
                        header = line.value;
                    } else {
                        rows.push(line.value);
                        if (rows.length === CHUNK_SIZE) {
                            const chunk = [header, ...rows].join('\n');
                            chunks.push(chunk);
                            rows = [];
                        }
                    }
                    return true;
                });

                if (header !== null && rows.length > 0) {
                    const chunk = [header, ...rows].join('\n');
                    chunks.push(chunk);
                }

                log.debug(`Chunk length ${chunks.length}`);

                let fileId;
                const timestamp = new Date().getTime();
                let counter = 0;

                for (let i = 0; i < chunks.length; i++) {
                    counter++
                    let filename = 'File_chunk_' + counter + '_csv' + timestamp;
                    let newFile = file.create({
                        name: filename,
                        fileType: file.Type.CSV,
                        contents: chunks[i],
                        folder: CSV_FOLDER,
                    });
                    fileId = newFile.save();
                    log.debug(`File is Saved ${fileId}`);
                }

                if (fileId) {
                    resolve({ message: 'CSV File is saved successfully' });
                } else {
                    reject({ message: 'Failed saving the CSV file' });
                }
            });
        };

        const displayMessage = (message, scriptContext ) => {
            var form = serverWidget.createForm({
                title: 'Status',
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
