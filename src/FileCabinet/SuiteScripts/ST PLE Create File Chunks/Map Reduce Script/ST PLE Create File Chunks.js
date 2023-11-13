/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/task', 'N/runtime', 'N/file'],
    /**
 * @param{record} record
 * @param{task} task
 * @param{runtime} runtime
 * @param{file} file
 */
    (record, task,runtime,file) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            try {
                // Get file ID of the CSV file to import from the script parameter
                const scriptObj = runtime.getCurrentScript();
                const fileIdFromParam = scriptObj.getParameter({ name: 'custscript_st_mr_csv_to_import' });

                // Size of file to create
                const chunkSize = 24999;

                // Load the file
                const fileObj = file.load({ id: fileIdFromParam });
                log.debug('fileObj', fileObj);
                // Use method to get an iterator for each line of the loaded file
                const lineIterator = fileObj.lines.iterator();
                let header = null;
                let rows = [];
                let chunks = [];

                lineIterator.each(function (line) {
                    if (!header) {
                        // This is the first line, which is the header
                        header = line.value;
                        log.debug('header', header);
                    } else {
                        // When the header is already acquired, each line will be pushed to the rows array
                        rows.push(line.value);
                        // When the rows array is equal to the chunkSize, attach the header to the rows array and push it to the chunks array.
                        if (rows.length === chunkSize) {
                            const chunk = [header, ...rows].join('\n');
                            chunks.push(chunk);
                            rows = [];
                        }
                    }
                    return true;
                });

                // For the remaining lines that did not achieve the number of specified chunkSize, take all those and attach the header and push it to the chunks array
                if (header !== null && rows.length > 0) {
                    const chunk = [header, ...rows].join('\n');
                    chunks.push(chunk);
                }

                log.debug('chunks', chunks);

                // Return the array values to the map stage
                return chunks;
            } catch (e) {
                log.error('Error:', e);
            }
        }

        //put in a breakpoint


        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            try {
                const FOLDER_ID = 2966;
                const value = mapContext.value;
                log.debug('value',value)
                // Generate a unique timestamp to append to the filename
                const timestamp = new Date().getTime();

                const filename = 'Chunk_' + timestamp;

                const chunkFile = file.create({
                    name: filename,
                    fileType: 'CSV',
                    contents : value,
                    folder: FOLDER_ID
                })

                const fileId = chunkFile.save()

                mapContext.write({
                    key: fileId,
                })


            } catch (e) {
                log.error('error', e);
            }
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            try {
                //Just passing file IDs to summarize them onto summary Stage
                let fileId = reduceContext.key;
                log.debug('fileId', fileId);

                reduceContext.write({
                    key: 'fileIds',
                    value: fileId
                });

            } catch (e) {
                log.error('Error', e)
            }

        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {
            const DEPLOYMENT_ID = 1209;
            const PARAM_FILE_IDS = 'custscript_st_mr_chunked_file_ids'
            let script_deployment = record.load({type: record.Type.SCRIPT_DEPLOYMENT, id: DEPLOYMENT_ID});

            //get fields Ids from the reduce stage.
            let fileIds = getFileIds(summaryContext);

            //Set the fileIds array to a script deployment parameter
            script_deployment.setValue({fieldId: PARAM_FILE_IDS, value: fileIds});
            script_deployment.save();

            getSummaryDetails(summaryContext);


        }

        const getFileIds = (context) => {
            const fileIds = [];
            context.output.iterator().each((key, value)=>{
                if(key == 'fileIds'){
                    let fileId = JSON.parse(value);
                    fileIds.push(fileId);
                    return true;
                }
            });
            log.debug('fileIds',fileIds)
            return JSON.stringify(fileIds);
        }
        const getSummaryDetails = (summaryContext) => {
            // Log details about the script's execution.
            log.audit({
                title: 'Usage units consumed',
                details: summaryContext.usage
            });
            log.audit({
                title: 'Concurrency',
                details: summaryContext.concurrency
            });

            //catch summary of errors.
            if (summaryContext.inputSummary.error) {

                log.error('Input Error', summaryContext.inputSummary.error);

            }
            summaryContext.mapSummary.errors.iterator().each(function (key, error) {

                log.error('Map Error for key: ' + key, error);

                return true;

            });
        }

        return {getInputData, map, reduce, summarize}

    });
