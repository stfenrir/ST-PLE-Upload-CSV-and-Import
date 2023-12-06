/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/ui/dialog', 'N/task', 'N/redirect', 'N/ui/message', "N/runtime"],

    (serverWidget, dialog, task, redirect, message,runtime) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */

        const IMPORT_CSV = 0;
        const LAUNCH_CUSTOMER_INVOICE = 1;
        const LAUNCH_VENDOR_BILLING = 2;
        const DELETE_EXTERNAL_EXCHANGE_DATA = 3;
        const SEND_INVOICE = 4
        const onRequest = (scriptContext) => {


                if (scriptContext.request.method === 'GET') {
                    var PEButton = scriptContext.request.parameters.PEButton;
                    var form = serverWidget.createForm({
                        title: 'Billing File Process',
                        hideNavBar: true
                    });
                   // form.clientScriptModulePath = 'SuiteScripts/ST PE Trigger CSV Import Script/Client Script/ST PE button Functions.js';
                    // var reportFrame = form.addField({
                    //     id: 'custpage_report_frame',
                    //     type: serverWidget.FieldType.INLINEHTML,
                    //     label: 'Report'
                    // })
                    // reportFrame.defaultValue = '<iframe src="https://7309664-sb1.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=598&deploy=1&compid=7309664_SB1&h=d4ffabc69e6da698ae9b" width="100%" height="10%"></iframe>'
                    if (PEButton) {
                        if (PEButton == IMPORT_CSV) {
                            var objTask = task.create({
                                taskType: task.TaskType.SCHEDULED_SCRIPT,
                                scriptId: 'customscript_st_trigger_csv_import',
                                deploymentId: 'customdeploy_st_trigger_csv_import_2',
                            })
                            var taskId = objTask.submit()
                            //  var taskId = 1
                            log.debug('taskId', taskId)
                            if (taskId) {
                                redirect.redirect({
                                    //url: 'https://7309664-sb1.app.netsuite.com/app/site/hosting/scriptlet.nl?script=598&deploy=1&PEButton=' + PEButton + '&csvImportTaskId=' + taskId
                                    url: 'https://7309664.app.netsuite.com/app/site/hosting/scriptlet.nl?script=598&deploy=1&PEButton=' + PEButton + '&csvImportTaskId=' + taskId
                                });
                            }
                        } else if (PEButton == LAUNCH_VENDOR_BILLING) {
                            var objTask = task.create({
                                taskType: task.TaskType.SCHEDULED_SCRIPT,
                                scriptId: 'customscript_st_eed_vend_bill',
                                deploymentId: 'customdeploy_st_eed_vend_bill',
                            })
                            var taskId = objTask.submit()
                            //var taskId = 1
                            log.debug('taskId', taskId)
                            if (taskId) {

                                redirect.redirect({
                                   // url: 'https://7309664-sb1.app.netsuite.com/app/site/hosting/scriptlet.nl?script=598&deploy=1&PEButton=' + PEButton
                                    url: 'https://7309664.app.netsuite.com/app/site/hosting/scriptlet.nl?script=598&deploy=1&PEButton=' + PEButton
                                });
                            }

                        } else if (PEButton == LAUNCH_CUSTOMER_INVOICE) {
                            var objTask = task.create({
                                taskType: task.TaskType.MAP_REDUCE,
                                scriptId: 'customscript_create_customer_inv',
                                deploymentId: 'customdeploy1',
                            })
                            var taskId = objTask.submit()
                            //var taskId = 1
                            log.debug('taskId', taskId)
                            if (taskId) {
                                redirect.redirect({
                                   // url: 'https://7309664-sb1.app.netsuite.com/app/site/hosting/scriptlet.nl?script=598&deploy=1&PEButton=' + PEButton
                                    url: 'https://7309664.app.netsuite.com/app/site/hosting/scriptlet.nl?script=598&deploy=1&PEButton=' + PEButton
                                });
                            }

                        } else if (PEButton == DELETE_EXTERNAL_EXCHANGE_DATA) {
                            var objTask = task.create({
                                taskType: task.TaskType.MAP_REDUCE,
                                scriptId: 'customscript_ns_mt_del_ext_exchange_data',
                                deploymentId: 'customdeploy_ns_mr_del_ext_exch_data',
                            })
                            var taskId = objTask.submit()
                            // var taskId = 1
                            log.debug('taskId', taskId)
                            if (taskId) {
                                redirect.redirect({
                                    //dashboard url
                                  //  url: 'https://7309664-sb1.app.netsuite.com/app/site/hosting/scriptlet.nl?script=598&deploy=1&PEButton=' + PEButton
                                    url: 'https://7309664.app.netsuite.com/app/site/hosting/scriptlet.nl?script=598&deploy=1&PEButton=' + PEButton
                                });
                            }
                        }

                    }

                    scriptContext.response.writePage(form);


                }


        }

        return {onRequest}

    });
