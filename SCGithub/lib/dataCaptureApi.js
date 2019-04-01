window.Thunderhead = window.Thunderhead || {};

Thunderhead.DataCaptureApi = {

    dataCaptureComponent: null,

    alertController: function(msg, text, cls){
        
        var html, alert;
        
        cls = cls || 'alert-success';
        
        html =     '<div class="alert '+ cls +' alert-dismissable">'+
                    '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>'+
                    '<span class="alert-msg"></span></div>';
        
        
        $('.alert').alert('close');
        
        alert = $(html);
         
        $('.alert-msg', alert).text(text+msg);
        
        $('body').append(alert);
        
        alert.alert();
        
        if(cls !== 'alert-success'){
            setTimeout(function(){
                alert.alert('close');
            },3000);
        }
    },

    loadTemplates: function(useExtAuth) {
        if (!useExtAuth) {
            $.ajax('../../cms/folderItems', {
                type : 'GET',
                dataType: 'xml',
                headers: {
                    'CSRFToken' : window.CSRFToken
                },
                data:{
                    mimeType : 'application/x-thunderhead-ddv',
                    tag : 'INTERVIEW',
                    projectScope : 'RELEASED'
                }
            }).done(function (data) {
                $('#interviewSelector').empty();
                var folderItems = data.childNodes[0].childNodes;
                var j = folderItems.length;
                var items = [];
                for (var i = 0; i < j; i++) {
                    if (folderItems[i].getElementsByTagName('itemType')[0].childNodes[0].nodeValue ===
                            'application/x-thunderhead-ddv') {
                        items.push({
                            'name': folderItems[i].getElementsByTagName('itemName')[0].childNodes[0].nodeValue,
                            'value': folderItems[i].getElementsByTagName('itemId')[0].childNodes[0].nodeValue
                        });
                    }
                }
                items = _.sortBy(items, function(resName) {
                    return resName.name;
                });
                j = items.length;
                for (i = 0; i < j; i++) {
                    var option = document.createElement('option');
                    option.innerHTML = items[i].name;
                    $(option).data('value', items[i].value);
                    $('#interviewSelector').append(option);
                }
            }).fail(function(data) {
                Thunderhead.DataCaptureApi.alertController('', 'Failed to load CMS resources.', 'alert-danger');
            });
        }
    },

    loadInterview: function(targetElID, useExternalAuth) {

        if (this.dataCaptureComponent !== null) {
            //Destroy any current setup
            this.dataCaptureComponent.destroy();
        }

        var json = document.getElementById('json').value;
        if (json.length !== 0) {
            json = $.parseJSON(json);
        }

        var config = {
            server: $('#dataCaptureServer').val(),
            context: $('#context').val(),
            templateResourceId: $('#resourceIdOnLoad').val(),
            templateResourceVersionId: $('#versionIdOnLoad').val(),
            projectId: $('#projectIdOnLoad').val(),
            name: $('#interviewName').val(),
            targetElementID: targetElID,
            loadStartupConfig: function() {
                return json;
            },
            callbacks: {
                beforePageValidated : function() {
                    Thunderhead.DataCaptureApi.updateStatus('Before page validated');
                    var val = $('#beforePageValidatedErr').val();
                    return val || '';
                },

                afterPageValidated : function() {
                    Thunderhead.DataCaptureApi.updateStatus('After page validated');
                    var val = $('#afterPageValidatedErr').val();
                    return val || '';
                }
            }
        };
        if (useExternalAuth) {
            config.interviewServiceUrl = $('#interviewServiceUrl').val();
        }

        this.dataCaptureComponent = new Thunderhead.DataCaptureComponent(config);

        this.dataCaptureComponent.addListener({
            interviewSubmitted : function() {
                Thunderhead.DataCaptureApi.updateStatus('Interview submitted');
            }, 
            buttonClicked : function(param) {
                Thunderhead.DataCaptureApi.updateStatus('Button Clicked', param.path);
            },
            interviewStarted : function(){
                $('.panel').fadeIn();
                $('input[type=text], textarea', 'div[name=interviewController]').val('');
                $('.alert').alert('close');
                Thunderhead.DataCaptureApi.updateStatus('Interview started');
            },
            interviewCancelled : function() {
                Thunderhead.DataCaptureApi.updateStatus('Interview canceled');
            },
            interviewCompleted : function() {
                Thunderhead.DataCaptureApi.updateStatus('Interview completed');
            },
            interviewFailed : function() {
                Thunderhead.DataCaptureApi.updateStatus('Interview failed');
            },
            fieldChanged : function(param){
                Thunderhead.DataCaptureApi.updateStatus('Changed to \'' + param.value + '\'', param.name);
            },
            beforePageLoaded : function(){
                Thunderhead.DataCaptureApi.updateStatus('Before page loaded');
            },
            afterPageLoaded : function(){
                Thunderhead.DataCaptureApi.updateStatus('After page loaded');
            },
            interviewSessionExpired : function(){
                Thunderhead.DataCaptureApi.updateStatus('Interview session expired');
            }
        });

        document.getElementById('setTransactionDataBefore').disabled = false;
        document.getElementById('startInterviewForResource').disabled = false;
        var setXForm = document.getElementById('setXForm');
        if (setXForm) {
            setXForm.disabled = false;
        }
    },
    
    beforeStartInterview: function() {
        var selectorValue, interviewResourceId, option, resourceId;
        
        selectorValue = $('#interviewSelector').val();
        interviewResourceId = $('#interviewResourceId').val();
        if (selectorValue){
            option  = $('#interviewSelector option').filter(function () { return $(this).val() === selectorValue; });
            resourceId = option.data('value');
            this.startInterview(resourceId, null);
        }
        else if (interviewResourceId) {
            this.startInterview(interviewResourceId, null);
        }
        else {
            this.alertController('', 'Interview not selected', 'alert-danger');
        }
    },
    
    startInterview: function(interviewId,resourceVersion) {
        this.updateStatus('startInterview button clicked');
        this.dataCaptureComponent.startInterviewForResource(null, interviewId, resourceVersion, $('#interviewName').val());
    },
    
    updateStatus: function(eventInputText, pathInputText) {
        $('#eventInput').val(eventInputText || '');
        $('#pathInput').val(pathInputText || '');
        $('#getSetFieldInput').val('');
        $('#pageIdInput').val('');
        $('#pageIdInputTrue').val('');
    },

    getPathValue: function(overrideFieldId) {
        var value = document.getElementById(overrideFieldId).value;
        return value || $('#pathInput').val();
    }

};

$( document ).ready(function() {
    
    var delayShow = 500;
    
    $('#setRemoveEmptyFields').on('change', function (e) {
        var value = this.checked;
        Thunderhead.DataCaptureApi.dataCaptureComponent.setRemoveEmptyFields(value);
    });
    
    $('#setFieldEnabled').on('change', function (e) {
        var value = this.checked;
        Thunderhead.DataCaptureApi.dataCaptureComponent.setFieldEnabled(Thunderhead.DataCaptureApi.getPathValue('manageDataPath'), value);

    });
    
});
