
(function (root, factory) {
    //@author http://ifandelse.com/its-not-hard-making-your-library-support-amd-and-commonjs/
    if (typeof module === "object" && module.exports) {
        module.exports = factory(require("jquery"));
    } else {
        factory(root.jQuery);
    }
}(this, function ($) {
    var Ssi_upload = function (element, options) {
        this.options = options;
        this.$element = '';
        this.language = locale[this.options.locale];
        this.uploadList = [];
        this.totalProgress = [];
        this.toUpload = [];
        this.imgNames = [];
        this.totalFilesLength = 0;
        this.successfulUpload = 0;
        this.aborted = 0;
        this.abortedWithError = 0;
        this.pending = 0;
        this.inProgress = 0;
        this.currentListLength = 0;
        this.inputName = '';
        this.init(element);
    };
    Ssi_upload.prototype.init = function (element) {
        $(element).addClass('ssi-uploadInput')
            .after(this.$element = $('<div class="ssi-uploader">'));
        var $chooseBtn = $('' +
            '<span class="ssi-InputLabel">' +
            '<button class="ssi-button success">' + this.language.chooseFiles + '</button>' +
            '</span>').append(element);
        var $uploadBtn = $('<button id="ssi-uploadBtn" class="ssi-button success ssi-hidden" >' +
            '<span class="ssi-btnIn">' + this.language.upload + '&nbsp;</span>' +
            '<div id="ssi-up_loading" class="ssi-btnIn"></div></button>');
        var $clearBtn = $('<button id="ssi-clearBtn" class="ssi-hidden ssi-button info" >' + this.language.clear +
            '</button>');
        var $abortBtn = $('<button id="ssi-abortBtn" class="ssi-button error ssi-cancelAll ssi-hidden" ><span class="inBtn">' + this.language.abort + ' </span></button>');
        if (this.options.inForm) {
            $uploadBtn.hide();
        }
        this.$element.append($('<div class="ssi-buttonWrapper">').append($chooseBtn, $abortBtn, $uploadBtn, $clearBtn));
        var $uploadBox;
        if (!this.options.preview) {
            this.$element.addClass('ssi-uploaderNP');
            var $fileList = $('<table id="ssi-fileList" class="ssi-fileList"></table>');
            var $namePreview = $('<span class="ssi-namePreview"></span>');
            var $mainBox = $('<div id="ssi-uploadFiles" class="ssi-tooltip ssi-uploadFiles ' + (this.options.dropZone ? 'ssi-dropZone' : '') + '"><div id="ssi-uploadProgressNoPreview" class="ssi-uploadProgressNoPreview"></div></div>')
                .append($namePreview);
            var $uploadDetails = $('<div class="ssi-uploadDetails"></div>').append($fileList);
            $uploadBox = $('<div class="ssi-uploadBoxWrapper ssi-uploadBox"></div>').append($mainBox, $uploadDetails);
            this.$element.prepend($uploadBox);
        } else {
            $uploadBox = $('<div id="ssi-previewBox" class="ssi-uploadBox ssi-previewBox ' + (this.options.dropZone ? 'ssi-dropZonePreview ssi-dropZone' : '') + '"><div id="ssi-info">' + (this.options.dropZone ? '<div id="ssi-DropZoneBack">' + this.language.drag + '</div>' : '') + '<div id="ssi-fileNumber" class="ssi-hidden">?</div></div></div>');
            this.$element.append($uploadBox);
        }
        var thisS = this;
        var $input = $chooseBtn.find(".ssi-uploadInput");
        this.inputName = $input.attr('name') || 'files';
        $chooseBtn.find('button').click(function (e) {
            e.preventDefault();
            $input.trigger('click');
        });
        $input.on('change', function () { //choose files
            thisS.toUploadFiles(this.files);
            if (!thisS.options.inForm) {
                $input.val('');
            }
        });
        //drag n drop
        if (thisS.options.dropZone) {
            $uploadBox.on("drop", function (e) {
                e.preventDefault();
                $uploadBox.removeClass("ssi-dragOver");
                var files = e.originalEvent.dataTransfer.files;
                thisS.toUploadFiles(files);
            });
            $uploadBox.on("dragover", function (e) {
                e.preventDefault();
                $uploadBox.addClass("ssi-dragOver");
                return false;
            });
            $uploadBox.on("dragleave", function (e) {
                e.preventDefault();
                $uploadBox.removeClass("ssi-dragOver");
                return false;
            });
        }

        if (!thisS.options.preview) {
            $mainBox.click(function () {
                if (thisS.currentListLength > 1)
                    $uploadDetails.toggleClass('ssi-uploadBoxOpened');
            })
        }

        $clearBtn.click(function (e) { //choose files completed and pending files
            e.preventDefault();
            thisS.clear();
        });

        $uploadBox.on('mouseenter', '.ssi-statusLabel', function (e) {
            var $eventTarget = $(e.currentTarget);
            var title = $eventTarget.attr('data-status');
            if (!title || title === '') {
                return;
            }
            tooltip($eventTarget, title, thisS);
        });
        $uploadBox.on('mouseenter', '#ssi-fileNumber', function (e) {
            var $eventTarget = $(e.currentTarget);

            var message = " " + thisS.language.pending + ": " + thisS.pending + " <br> " + thisS.language.completed + ": " + (thisS.successfulUpload + thisS.aborted + thisS.abortedWithError) + "<br> " + thisS.language.inProgress + ": " + thisS.inProgress;
            tooltip($eventTarget, message, thisS);
        });

        $uploadBox.on('click', '.ssi-removeBtn', function (e) { //remove the file from list
            e.preventDefault();
            var $currentTarget = $(e.currentTarget);
            var index = $currentTarget.data('delete'); //get file's index
            thisS.pending--; //reduce pending number by 1
            thisS.currentListLength--; //reduce current list length by 1
            if (thisS.pending < 1) {
                thisS.$element.find('#ssi-fileNumber').addClass('ssi-hidden');
            }
            if (thisS.pending === 0) {
                $uploadBtn.prop('disabled', true); //if there is no more files disable upload button
            }
            if (thisS.options.preview) { //if preview is true
                $currentTarget.parents('table.ssi-imgToUploadTable').remove(); //remove table
            } else {
                var target = $currentTarget.parents('tr.ssi-toUploadTr'); //find the tr of file
                $namePreview.html((thisS.currentListLength) + ' files'); //set the main name to the remaining files
                target.prev().remove();// remove empty tr (using id for margin between rows)
                target.remove();// remove the file
                if (thisS.currentListLength === 1) { //if only one file left in the list
                    setLastElementName(thisS); //set main preview to display the name
                }
            }
            thisS.toUpload[index] = null; //set the file's obj to null (we don't splice it because we need to keep the same indexes)
            thisS.imgNames[index] = null; //set the file's name to null

            if (thisS.currentListLength === 0) { // if no more files in the list
                if (!thisS.options.dropZone) { // if drag and drop is disabled
                    $uploadBox.removeClass('ssi-uploadNoDropZone');
                }
                $clearBtn.addClass('ssi-hidden');
                $uploadBtn.addClass('ssi-hidden');
            }
        });
        $uploadBox.on('click', '.ssi-abortUpload', function (e) {//abort one element
            e.preventDefault();
            var $eventTarget = $(e.currentTarget);
            var index = $eventTarget.data('delete');// get the element id
            thisS.abort(index); // abort request
        });
        //----------------------------UPLOADFILES------------------------------------
        $uploadBtn.click(function (e) {// upload the files
            e.preventDefault();
            thisS.uploadFiles();
        });
        $abortBtn.click(function (e) { // abort all requests
            e.preventDefault();
            thisS.abortAll();
        });

    };
    function tooltip($target, text, thisS) {
        $target = $($target);
        text = text || $target.data('title');
        if (!text) text = $target.attr('title');
        if (!text) return;
        var $toolTip = $('<div class="ssi-fadeOut ssi-fade ssi-tooltipText">'
            + text +
            '</div>').appendTo(thisS.$element);
        $target.one('mouseleave', function () {
            $toolTip.remove();
        });
        var offset = -16;
        if ($target.hasClass('ssi-noPreviewSubMessage')) {
            offset = 23;
        }
        $toolTip.css({
            top: $target.position().top - $toolTip.height() + offset,
            left: $target.position().left - $toolTip.width() / 2
        })
            .removeClass('ssi-fadeOut');
        return $toolTip;
    }

    Ssi_upload.prototype.abortAll = function () {
        for (var i = 0; i < this.uploadList.length; i++) { //all element in the list
            if (typeof this.uploadList[i] === 'object') {// check if not deleted
                this.abort(i);
            }
        }
    };
    Ssi_upload.prototype.toUploadFiles = function (files) {
        if (typeof this.options.maxNumberOfFiles === 'number') {
            if ((this.inProgress + this.pending) >= this.options.maxNumberOfFiles) {// if in progress files + pending files are more than the number that we have define as max number of files pre download
                return;//don't do anything
            }
        }
        var thisS = this,
            j = 0,
            length,
            imgContent = '',
            $uploadBtn = this.$element.find('#ssi-uploadBtn'),
            $clearBtn = this.$element.find('#ssi-clearBtn'),
            $fileList = this.$element.find('#ssi-fileList'),
            $uploadBox = this.$element.find('.ssi-uploadBox'),
            imgs = [];
        if ((this.inProgress === 0 && this.pending === 0)) { //if no file are pending or are in progress
            this.clear(); //clear the list
        }
        var extErrors = [], sizeErrors = [], errorMessage = '';
        var toUploadLength, filesLength = length = toUploadLength = files.length;
        if (typeof this.options.maxNumberOfFiles === 'number') {//check if requested files agree with our arguments
            if (filesLength > this.options.maxNumberOfFiles - (this.inProgress + this.pending)) { //if requested files is more than we need
                filesLength = toUploadLength = this.options.maxNumberOfFiles - (this.inProgress + this.pending); // set variable to the number of files we need
            }
        }
        //
        for (var i = 0; i < filesLength; i++) {
            var file = files[i],
                ext = file.name.getExtension();// get file's extension

            if ($.inArray(ext, this.options.allowed) === -1) { // if requested file not allowed
                if (length > filesLength) {//there are more file we dont pick
                    filesLength++;//the add 1 more loop
                } else {
                    toUploadLength--;
                }
                if ($.inArray(ext, extErrors) === -1) {//if we see first time this extension
                    extErrors.push(ext); //push it to extErrors variable
                }
            } else if ((file.size * Math.pow(10, -6)).toFixed(2) > this.options.maxFileSize) {//if file size is more than we ask
                if (length > filesLength) {
                    filesLength++;
                } else {
                    toUploadLength--;
                }
                sizeErrors.push(cutFileName(file.name, ext, 15));//register a size error
            } else if (this.options.allowDuplicates || $.inArray(file.name, this.imgNames) === -1) {// if the file is not already in the list
                $uploadBtn.prop("disabled", false);
                setupReader(file);
                this.pending++; // we have one more file that is pending to be uploaded
                this.currentListLength++;// we have one more file in the list
            } else {
                if (length > filesLength) {
                    filesLength++;
                } else {
                    toUploadLength--;
                }
            }
        }
        var extErrorsLength = extErrors.length, sizeErrorsLength = sizeErrors.length;
        if (extErrorsLength + sizeErrorsLength > 0) { // in the end expose all errors
            if (extErrorsLength > 0) {
                errorMessage = this.language.extError.replaceText(extErrors.toString().replace(/,/g, ', '));
            }
            if (sizeErrorsLength > 0) {
                errorMessage += this.language.sizeError.replaceText(sizeErrors.toString().replace(/,/g, ', '), this.options.maxFileSize + 'mb');
            }
            this.options.errorHandler.method(errorMessage, this.options.errorHandler.error);
        }
        function setupReader() {
            var index = thisS.imgNames.length;
            if (index === 0) {//do it only the first time
                if (thisS.options.preview) {
                    if (!thisS.options.dropZone) {
                        $uploadBox.addClass('ssi-uploadNoDropZone')
                    }
                }
                $uploadBtn.removeClass('ssi-hidden');
                $clearBtn.removeClass('ssi-hidden');
            }
            $clearBtn.prop('disabled', true);
            thisS.toUpload[index] = file;
            var filename = file.name;
            var ext = filename.getExtension(); //get file's extension
            thisS.imgNames[index] = filename; //register file's name
            if (thisS.options.preview) {
                var getTemplate = function (content) {
                    return '<table class="ssi-imgToUploadTable ssi-pending">' +
                        '<tr><td class="ssi-upImgTd">' + content + '</td></tr>' +
                        '<tr><td><div id="ssi-uploadProgress' + index + '" class="ssi-hidden ssi-uploadProgress"></div></td></tr>' +
                        '<tr><td><button data-delete="' + index + '" class=" ssi-button error ssi-removeBtn"><span class="trash10 trash"></span></button></td></tr>' +
                        '<tr><td>' + cutFileName(filename, ext, 15) + '</td></tr></table>'
                };
                var fileType = file.type.split('/');
                if (fileType[0] == 'image') {
                    $uploadBtn.prop("disabled", true);
                    $clearBtn.prop("disabled", true);
                    var fileReader = new FileReader();
                    fileReader.onload = function () {
                        imgContent += getTemplate('<img class="ssi-imgToUpload" src=""/><i class="fa-spin fa fa-spinner fa-pulse"></i>'); // set the files element without the img
                        imgs[index] = fileReader.result;
                        j++;
                        if (toUploadLength === j) {// if all elements are in place lets load images
                            thisS.$element.find('#ssi-fileNumber').removeClass('ssi-hidden');
                            $uploadBox.append(imgContent);
                            setTimeout(function () {
                                setImg();//and load the images
                                $uploadBtn.prop("disabled", false);
                                $clearBtn.prop("disabled", false);
                            }, 10);
                            $uploadBtn.prop("disabled", false);
                            $clearBtn.prop("disabled", false);

                            imgContent = '';
                            toUploadLength = [];
                        } else if (toUploadLength / 2 == Math.round(j)) {
                            $uploadBox.append(imgContent);
                            setImg();//and load the images
                            imgContent = '';
                        }
                    };
                    fileReader.readAsDataURL(file);
                } else {
                    imgs[index] = null;
                    $uploadBox.append(getTemplate('<div class="document-item" href="test.mov" filetype="' + ext + '"><span class = "fileCorner"></span></div>'));
                    j++;
                }
            } else {
                $clearBtn.prop('disabled', false);
                thisS.$element.find('.ssi-namePreview').html((index === 0 ? cutFileName(filename, ext, 13) : (thisS.currentListLength + 1) + ' ' + thisS.language.files));//set name preview
                $fileList.append('<tr class="ssi-space"><td></td></tr>' +//append files element to dom
                    '<tr class="ssi-toUploadTr ssi-pending"><td><div id="ssi-uploadProgress' + index + '" class="ssi-hidden ssi-uploadProgress ssi-uploadProgressNoPre"></div>' +
                    '<span>' + cutFileName(filename, ext, 20) + '</span></td>' +
                    '<td><a data-delete="' + index + '" class="ssi-button ssi-removeBtn  ssi-removeBtnNP"><span class="trash7 trash"></span></a></td></tr>');
            }

            var setImg = function () {//load the images
                for (var i = 0; i < imgs.length; i++) {
                    if (imgs[i] !== null) {
                        $uploadBox.find("#ssi-uploadProgress" + i).parents('table.ssi-imgToUploadTable')
                            .find('.ssi-imgToUpload')
                            .attr('src', imgs[i]) //set src of the image
                            .next().remove();//remove the spinner
                        imgs[i] = null;
                    }
                }
                imgs = [];
            };
        }
    };
    var clearCompleted = function (thisS) {//clear all completed files
        var $completed = thisS.$element.find('.ssi-completed');
        thisS.successfulUpload = 0;
        thisS.aborted = 0;
        thisS.abortedWithError = 0;
        if (!thisS.options.preview) $completed.prev('tr').remove();
        $completed.remove();
    };
    var clearPending = function (thisS) {//clear all pending files
        var $pending = thisS.$element.find('.ssi-pending');
        var length = thisS.imgNames.length;
        for (var i = 0; i < length; i++) {
            if (thisS.imgNames[i] === null) {
                thisS.toUpload.splice(i, 1);
                thisS.imgNames.splice(i, 1);
            }
        }
        thisS.toUpload.splice(-thisS.pending, thisS.pending);
        thisS.imgNames.splice(-thisS.pending, thisS.pending);
        thisS.pending = 0;
        if (!thisS.options.preview) $pending.prev('tr').remove();
        $pending.remove();
    };

    Ssi_upload.prototype.clear = function (action) {//clean the list of all non in progress files
        switch (action) {
            case 'pending':
                clearPending(this);
                break;
            case 'completed':
                clearCompleted(this);
                break;
            default:
                clearPending(this);
                clearCompleted(this);
        }
        var $uploadBtn = this.$element.find('#ssi-uploadBtn'),
            $clearBtn = this.$element.find('#ssi-clearBtn');
        this.currentListLength = getCurrentListLength(this);
        if (this.inProgress === 0) { //if no file are uploading right now
            this.totalProgress = [];
        }
        if ((this.currentListLength === 0)) { // if no items in the list
            $clearBtn.addClass('ssi-hidden');
            $uploadBtn.addClass('ssi-hidden');
            this.$element.find('#ssi-fileNumber').addClass('ssi-hidden');
            this.totalFilesLength = 0;
            if (!this.options.dropZone) {
                this.$element.find('.ssi-uploadBox').removeClass('ssi-uploadNoDropZone')
            }
        }
        $clearBtn.prop('disabled', true);
        $uploadBtn.prop('disabled', true);

        if (!this.options.preview) {
            setNamePreview(this);
        }
    };

    var setNamePreview = function (thisS) {//set the name preview according to the remaining elements in the list
        if (thisS.currentListLength > 1) {//if more than one element left
            thisS.$element.find('.ssi-namePreview').html(thisS.currentListLength + ' files'); // set the name preview to the length of the remaining items
        } else if (thisS.currentListLength === 1) {//if one left
            setLastElementName(thisS); // set the name of the element
        } else { //if no elements left
            thisS.$element.find('.ssi-uploadDetails').removeClass('ssi-uploadBoxOpened');
            thisS.$element.find('#ssi-fileList').empty();//empty list
            thisS.$element.find('.ssi-namePreview').empty();//empty the name preview
        }

    };

    Ssi_upload.prototype.appendFileToFormData = function (file) {
        var formData = new FormData();//set the form data

        formData.append(this.inputName, file);//append the first file to the form data
        $.each(this.options.data, function (key, value) {// append all extra data
            formData.append(key, value);
        });
        return formData;
    }


    Ssi_upload.prototype.tryToTransform = function (file, callback) {
        if (typeof this.options.transformFile === 'function') {
            try {
                file = this.options.transformFile(file);// execute the transformFile
                if (file instanceof Promise) {
                    file.then(function (newFile) {
                        callback(newFile)
                    })
                } else {
                    callback(file)
                }
            } catch (err) {
                if (!this.options.ignoreCallbackErrors) {
                    console.error('There is an error in transformFile');
                    return console.error(err);
                }
            }
        } else {
            callback(file)
        }
    }
    Ssi_upload.prototype.uploadFiles = function () {// upload the pending files
        if (this.pending > 0) {
            if (typeof this.options.beforeUpload === 'function') {
                try {
                    this.options.beforeUpload();// execute the beforeUpload callback
                } catch (err) {
                    if (!this.options.ignoreCallbackErrors) {
                        console.log('There is an error in beforeUpload callback');
                        return console.log(err);
                    }
                }
            }
            this.$element.find('#ssi-abortBtn').removeClass('ssi-hidden');
            this.$element.find('.ssi-removeBtn')
                .addClass('ssi-abortUpload')
                .removeClass('ssi-removeBtn')
                .children('span').removeClass('trash7 trash10 trash')
                .addClass((this.options.preview ? 'ban7w' : 'ban7'));//transform remove button to abort button
            var $uploadBtn = this.$element.find('#ssi-uploadBtn'),
                $clearBtn = this.$element.find('#ssi-clearBtn');
            $uploadBtn.prop("disabled", true);
            var thisS = this,
                i = this.totalFilesLength;
            if (this.totalFilesLength !== 0 && !this.options.preview) {
                setNamePreview(this);
            }
            this.inProgress += this.pending;// add pending to in progress
            this.totalFilesLength += this.pending;// this variable is to prevent id duplication during uploads
            this.pending = 0;
            if (this.inProgress === this.currentListLength) {// disable the clear button if no items in list we can be remove
                $clearBtn.prop("disabled", true);
            }

            while (!thisS.toUpload[i]) { // do it until you find a file
                i++;
            }
            var file = thisS.toUpload[i]
            thisS.tryToTransform(file, function (newFile) {
                var formData = thisS.appendFileToFormData(newFile)
                ajaxLoopRequest(formData, i)
            })
        }
        //--------------start of ajax request-----------------------
        function ajaxLoopRequest(formData, ii) {
            var selector = 'table.ssi-imgToUploadTable';
            if (!thisS.options.preview) {
                selector = 'tr.ssi-toUploadTr'
            }
            var uploadBar = thisS.$element.find('#ssi-uploadProgress' + ii);//get the file's  progress bar
            uploadBar.removeClass('ssi-hidden') //make it visible
                .parents(selector).removeClass('ssi-pending');
            var ajaxOptions = $.extend({}, {//store the request to the uploadList variable
                xhr: function () {
                    var xhr = new window.XMLHttpRequest();
                    xhr.upload.addEventListener('progress', function (e) {// add event listener to progress
                        if (e.lengthComputable) {
                            var percentComplete = (e.loaded / e.total) * 100;// calculate the progress
                            if (uploadBar) {
                                uploadBar.css({
                                    width: percentComplete + '%'//update the progress bar width according to the progress
                                });
                            }
                            thisS.totalProgress[ii] = percentComplete;//store the progress to the array
                            var sum = arraySum(thisS.totalProgress) / (thisS.inProgress + thisS.successfulUpload);//and calculate the overall progress
                            if (!thisS.options.preview) {
                                thisS.$element.find('#ssi-uploadProgressNoPreview')
                                    .removeClass('ssi-hidden')
                                    .css({
                                        width: sum + '%'
                                    });
                            }
                            $uploadBtn.find('#ssi-up_loading').html(Math.ceil(sum) + '%');// add to upload button the current overall progress percent number
                        }
                    }, false);
                    return xhr;
                },
                async: true,
                beforeSend: function (xhr, settings) {
                    thisS.uploadList[ii] = xhr;
                    console.log("TCL: ajaxLoopRequest -> thisS.toUpload", thisS.toUpload)
                    console.log("TCL: ajaxLoopRequest -> ii", ii)
                    $uploadBtn.find('#ssi-up_loading') //add spiner to uploadbutton
                        .html('<i class="fa fa-spinner fa-pulse"></i>');
                    var fileInfo = {
                        name: thisS.toUpload[ii].name,//send some info of the file
                        type: thisS.toUpload[ii].type,
                        size: (thisS.toUpload[ii].size / 1024).toFixed(2)
                    };
                    if (typeof thisS.options.beforeEachUpload === 'function') {
                        try {
                            // execute the beforeEachUpload callback and save the returned value
                            var msg = thisS.options.beforeEachUpload(fileInfo, xhr, settings);
                        } catch (err) {
                            if (err.name == 'Error') {
                                thisS.abort(ii, undefined, err.message);//call the abort function
                            } else {
                                if (!thisS.options.ignoreCallbackErrors) {
                                    console.log('There is an error in beforeEachUpload callback. Filename:' + thisS.toUpload[ii].name);
                                    console.log(err);
                                    thisS.abort(ii, undefined, thisS.language.wentWrong);//call the abort function
                                }
                            }
                            return;
                        }
                    }
                    thisS.$element.find('input.ssi-uploadInput').trigger('beforeEachUpload.ssi-uploader', [fileInfo]);
                    if (xhr.status === 0) {
                        if (xhr.statusText === 'canceled') {//if user used beforeEachUpload to abort the request
                            if (typeof msg === 'undefined') {//if no message
                                msg = false; //because user have already aborted the request set to false or anything else except undefined to prevent to abort it again
                            }
                            thisS.abortedWithError++;// we have one error more
                            thisS.abort(ii, msg);//call the abort function
                        }
                    }
                },
                type: 'POST',
                method: 'POST',
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                url: thisS.options.url,
                error: function (request, error) {
                    if (error !== 'abort') {
                        uploadBar.addClass('ssi-canceledProgressBar');
                        var msg = thisS.language.error;
                        thisS.abortedWithError++;//add one more error
                        thisS.totalProgress.splice(ii, 1); //remove from progress array
                        if (!thisS.options.preview) {
                            msg = '<span class="exclamation7"></span>';
                        }
                        setElementMessage(thisS, ii, 'error', msg, thisS.language.serverError);
                        thisS.totalProgress[ii] = '';
                        thisS.inProgress--;
                        $clearBtn.prop("disabled", false);
                        if (typeof thisS.options.onEachUpload === 'function') {//execute the onEachUpload callback
                            try {
                                thisS.options.onEachUpload({//and return some info
                                    uploadStatus: 'error',
                                    responseMsg: thisS.language.serverError,
                                    name: thisS.toUpload[ii].name,
                                    size: (thisS.toUpload[ii].size / 1024).toFixed(2),
                                    type: thisS.toUpload[ii].type
                                });
                            } catch (err) {
                                if (!thisS.options.ignoreCallbackErrors) {
                                    console.log('There is an error in onEachUpload callback. File name:' + thisS.toUpload[ii].name);
                                    console.log(err);
                                }
                            }
                        }
                        if (getCompleteStatus(thisS)) {//if no more elements in progress
                            finishUpload(thisS);
                        }
                        console.log(arguments);//log the error
                        console.log(" Ajax error: " + error);
                    }
                }
            }, thisS.options.ajaxOptions);
            $.ajax(ajaxOptions).done(function (responseData, textStatus, jqXHR) {
                var msg, title = '', dataType = 'error', spanClass = 'exclamation', data;
                try {
                    data = $.parseJSON(responseData);
                } catch (err) {
                    data = responseData;
                }
                if (thisS.options.responseValidation) {
                    var valData = thisS.options.responseValidation;
                    if (typeof valData.validationKey === 'object' && valData.resultKey == 'validationKey') {
                        if (data.hasOwnProperty(valData.validationKey.success)) {
                            cb(true, data[valData.validationKey.success]);
                        } else {
                            cb(false, data[valData.validationKey.error]);
                        }
                    } else {
                        if (data[valData.validationKey] == valData.success) {
                            cb(true, data[valData.resultKey]);
                        } else {
                            cb(false, data[valData.resultKey]);
                        }
                    }
                } else {
                    if (jqXHR.status == 200) {
                        cb(true, data);
                    } else {
                        cb(false, data);
                    }
                }
                function cb(result, data) {
                    if (result) {//if response type is success
                        dataType = 'success';
                        msg = thisS.language.success;
                        spanClass = 'check';
                        thisS.successfulUpload++;// one more successful upload
                    } else {
                        uploadBar.addClass('ssi-canceledProgressBar');
                        if (thisS.options.preview) {
                            msg = thisS.language.error;
                        }
                        thisS.abortedWithError++;
                    }
                    title = data;
                }

                if (!thisS.options.preview) {
                    msg = '<span class="' + spanClass + '7"></span>';
                }
                setElementMessage(thisS, ii, dataType, msg, title);
                var fileInfo = {//and return some info
                    uploadStatus: dataType,
                    responseMsg: title,
                    name: thisS.toUpload[ii].name,
                    size: (thisS.toUpload[ii].size / 1024).toFixed(2),
                    type: thisS.toUpload[ii].type
                };
                if (typeof thisS.options.onEachUpload === 'function') {//execute the onEachUpload callback
                    try {
                        thisS.options.onEachUpload(fileInfo, data);
                    } catch (err) {
                        console.log('There is an error in onEachUpload callback');
                        console.log(err);
                    }
                }
                thisS.$element.find('input.ssi-uploadInput').trigger('onEachUpload.ssi-uploader', [fileInfo]);
                thisS.inProgress--;//one less in progress upload
                $clearBtn.prop("disabled", false);
                if (getCompleteStatus(thisS)) {//if no more files in progress
                    finishUpload(thisS);
                }
                // thisS.totalProgress[ii]='';
                thisS.uploadList[ii] = '';
                thisS.toUpload[ii] = '';
                thisS.imgNames[ii] = '';
            });
            //--------------end of ajax request-----------------------

            i = ii;
            i++;//go to the next element
            while (!thisS.toUpload[i] && typeof thisS.toUpload[i] !== 'undefined') {// do it until you find a file
                i++;
            }
            if (i < thisS.toUpload.length) {// if more files exist start the next request
                const nextFile = thisS.toUpload[i]
                thisS.tryToTransform(nextFile, function (newFile) {
                    var formData = thisS.appendFileToFormData(newFile)
                    ajaxLoopRequest(formData, i)
                })
            }
        }
    };
    var setElementMessage = function (thisS, index, msgType, msg, title) {
        var className = '', elementSelector = 'table.ssi-imgToUploadTable', element;
        if (!thisS.options.preview) {
            className = 'ssi-noPreviewSubMessage';
            elementSelector = 'tr.ssi-toUploadTr';
            if (thisS.currentListLength === 1) {
                thisS.errors = title;
            }
        }

        element = thisS.$element.find(".ssi-abortUpload[data-delete='" + index + "']");
        element.parents(elementSelector).addClass('ssi-completed');
        element.after(getResultMessage(msgType, msg, title, className))
            .remove();
    };

    var getCompleteStatus = function (thisS) {//check if file are in progress
        return (thisS.inProgress === 0);
    };

    var getResultMessage = function (type, msg, title, classes) {//return a message label
        return '<span class="ssi-statusLabel ' + classes + ' ' + type + '" data-status="' + title + '">' + msg + '</span>';
    };

    var getCurrentListLength = function (thisS) { //get the list length
        return (thisS.inProgress + thisS.successfulUpload + thisS.aborted + thisS.abortedWithError + thisS.pending);
    };
    var setLastElementName = function (thisS) { //if one file in list get the last file's name and put it to the name preview
        var fileName = thisS.$element.find('#ssi-fileList').find('span').html();//find the only span left
        var ext = fileName.getExtension();//get the extension
        thisS.$element.find('.ssi-uploadDetails').removeClass('ssi-uploadBoxOpened');
        thisS.$element.find('.ssi-namePreview').html(cutFileName(fileName, ext, 15));//short the name and put it to the name preview
    };
    Ssi_upload.prototype.abort = function (index, title, mmsg) {//abort a request
        if (typeof title === 'undefined') {//if no title
            this.uploadList[index].abort();// abort the element
            this.totalProgress[index] = '';
            title = mmsg || 'Aborted';
            this.aborted++;// one more aborted file
        } else if (typeof title !== 'string') {//if not string that means that the request aborted with the beforeEachUpload callback and no message returned
            title = '';
        }
        //nothing of the above happened that means the user aborted the request with the beforeUpload callback and returned a message
        var msg = this.language.aborted;
        if (!this.options.preview) {
            msg = '<span class="ban7w"></span>';
        }
        setElementMessage(this, index, 'error', msg, (title));
        this.$element.find('#ssi-uploadProgress' + index).removeClass('ssi-hidden').addClass('ssi-canceledProgressBar');
        this.toUpload[index] = undefined;
        this.uploadList[index] = undefined;
        this.imgNames[index] = undefined;
        this.$element.find('#ssi-clearBtn').prop("disabled", false);
        this.inProgress--;//one less in progress file
        if (getCompleteStatus(this)) {//if no more file in progress
            finishUpload(this);
        }

    };

    var finishUpload = function (thisS) {//when every uplaod ends
        thisS.$element.find('#ssi-abortBtn').addClass('ssi-hidden');
        if (!thisS.options.preview) {//display tha main message in the name preview
            var type = 'error', title = '', msg = '';
            if (thisS.abortedWithError > 0) { //if no errors
                if (thisS.totalFilesLength === 1) {// if only one file in the list
                    title = thisS.errors; //display the error
                } else {//else display something more general message
                    title = thisS.language.someErrorsOccurred
                }
                msg = '<span class="exclamation23"></span>';
            } else if (thisS.aborted > 0 && thisS.successfulUpload === 0) {//if all request aborted
                msg = '<span class="ban23"></span>';
                title = thisS.language.aborted;
            } else if (thisS.successfulUpload > 0) {// all request were successfull
                type = 'success';
                msg = '<span class="check23"></span>';
                title = thisS.language.sucUpload;
            }
            thisS.$element.find('.ssi-namePreview').append(getResultMessage(type, msg, title, 'ssi-noPreviewMessage'));//show the message in the name preview
            thisS.$element.find('#ssi-uploadProgressNoPreview') //remove main overall progress bar
                .removeAttr('styles')
                .addClass('ssi-hidden');
        }
        if (typeof thisS.options.onUpload === 'function') {
            try {
                thisS.options.onUpload(type);//execute the on Upload callback
            } catch (err) {
                if (!thisS.options.ignoreCallbackErrors) {
                    console.log('There is an error in onUpload callback');
                    console.log(err);
                }
            }
        }
        thisS.$element.find('input.ssi-uploadInput').trigger('onUpload.ssi-uploader', [type]);
        var $uploadBtn = thisS.$element.find('#ssi-uploadBtn');
        thisS.$element.find('#ssi-clearBtn').prop("disabled", false);
        $uploadBtn.prop("disabled", false)
            .find('#ssi-up_loading')
            .empty();
        if (thisS.pending === 0) {
            $uploadBtn.addClass('ssi-hidden');
            thisS.toUpload = [];
            thisS.imgNames = [];
            thisS.totalFilesLength = 0;
        }
        thisS.uploadList = [];
        thisS.totalProgress = [];
        thisS.currentListLength = getCurrentListLength(thisS);
        thisS.inProgress = 0;
    };

    $.fn.ssi_uploader = function (opts) {
        var defaults = {
            allowDuplicates: false,
            url: '',
            data: {},
            locale: 'en',
            preview: true,
            dropZone: true,
            maxNumberOfFiles: '',
            responseValidation: false,
            ignoreCallbackErrors: false,
            maxFileSize: 2,
            inForm: false,
            ajaxOptions: {},
            onUpload: function () {
            },
            onEachUpload: function () {
            },
            beforeUpload: function () {
            },
            beforeEachUpload: function () {
            },
            allowed: '',
            errorHandler: {
                method: function (msg) {
                    alert(msg);
                },
                success: 'success',
                error: 'error'
            }
        };
        var options = $.extend(true, defaults, opts);
        options.allowed = options.allowed || ['jpg', 'jpeg', 'png', 'bmp', 'gif'];
        return this.each(function () {
            var $element = $(this);
            if ($element.is('input[type="file"]')) {
                if ($element.data('ssi_upload')) return;
                var ssi_upload = new Ssi_upload(this, options);
                $element.data('ssi_upload', ssi_upload);
            } else {
                console.log('The targeted element is not file input.')
            }
        });
    };
    //functions
    String.prototype.replaceText = function () {//replace $ with variables
        var args = Array.apply(null, arguments);
        var text = this;
        for (var i = 0; i < args.length; i++) {
            text = text.replace('$' + (i + 1), args[i])
        }
        return text;
    };
    String.prototype.getExtension = function () {//returns the extension of a path or file
        return this.split('.').pop().toLowerCase();
    };
    var cutFileName = function (word, ext, maxLength) {//shorten the name
        if (typeof ext === 'undefined') ext = '';
        if (typeof maxLength === 'undefined') maxLength = 10;
        var min = 4;
        if (maxLength < min) return;
        var extLength = ext.length;
        var wordLength = word.length;
        if ((wordLength - 2) > maxLength) {
            word = word.substring(0, maxLength);
            var wl = word.length - extLength;
            word = word.substring(0, wl);
            return word + '...' + ext;
        } else return word;
    };

    var arraySum = function (arr) {//return the sum of an array
        var sum = 0;
        for (var i = 0; i < arr.length; i++) {
            if (typeof arr[i] === 'number')
                sum += arr[i];
        }
        return sum;
    };

    var locale = {
        en: {
            success: 'Success',
            sucUpload: 'Successful upload',
            chooseFiles: 'Choose files',
            uploadFailed: 'Upload failed',
            serverError: 'Internal server error',
            error: 'Error',
            abort: 'Abort',
            aborted: 'Aborted',
            files: 'files',
            upload: 'Upload',
            clear: 'Clear',
            drag: 'Drag n Drop',
            sizeError: '$1 exceed the size limit of $2',// $1=file name ,$2=max ie( example.jpg has has exceed the size limit of 2mb)
            extError: '$1 file types are not supported',//$1=file extension ie(exe files are not supported)
            someErrorsOccurred: 'Some errors occurred!',
            wentWrong: 'Something went wrong!',
            pending: 'Pending',
            completed: 'Completed',
            inProgress: 'In progress'
        },
        gr: {
            success: 'Επιτυχία',
            sucUpload: 'Επιτυχής μεταφόρτωση',
            chooseFiles: 'Επιλέξτε αρχεία',
            uploadFailed: 'Η μεταφόρτωση απέτυχε!',
            serverError: 'Εσωτερικό σφάλμα διακομιστή!',
            error: 'Σφάλμα',
            abort: 'Διακοπή',
            aborted: 'Διακόπηκε',
            files: 'αρχεία',
            upload: 'Μεταφόρτωση',
            clear: 'Εκκαθάριση',
            drag: 'Συρετε εδώ...',
            sizeError: '$1 έχει ξεπεράσει το όριο των $2.',// $1=file name ,$2=max file size ie( example.jpg has has exceed the size limit of 2mb)
            extError: '$1 αρχεία δεν υποστηρίζονται.',// $1=file extension ie(exe files are not supported)
            someErrorsOccurred: 'Σημειώθηκαν ορισμένα λάθη!',
            wentWrong: 'Κάτι πήγε στραβά!',
            pending: 'Σε εκκρεμότητα',
            completed: 'Ολοκληρομένα',
            inProgress: 'Σε εξέλιξη'
        },
        fr: { //@author Badulesia
            success: 'Succès',
            sucUpload: 'Envoi réussi',
            chooseFiles: 'Choisissez fichiers',
            uploadFailed: 'Envoi échoué',
            serverError: 'Erreur interne du serveur',
            error: 'Erreur',
            abort: 'Annuler',
            aborted: 'Annulé',
            files: 'Fichiers',
            upload: 'Envoyer',
            clear: 'Effacer',
            drag: 'Glisser déposer',
            sizeError: '$1 excède la taille limite de $2',// $1=file name ,$2=max ie( example.jpg has has exceed the size limit of 2mb)
            extError: 'Types de fichier $1 non autorisé',//$1=file extension ie(exe files are not supported)
            someErrorsOccurred: 'Une erreur a eu lieu !',
            wentWrong: 'Une erreur a eu lieu !',
            pending: 'Εn attendant',
            completed: 'Terminé',
            inProgress: 'En cours'
        },
        zh_CN: {
            success: '上传成功',
            sucUpload: '上传成功',
            chooseFiles: '选择文件',
            uploadFailed: '上传失败',
            serverError: '服务器内部错误',
            error: '错误',
            abort: '中止',
            aborted: '已中止',
            files: '文件',
            upload: '上传',
            clear: '清空',
            drag: '将图片拖拽至此并释放',
            sizeError: '$1 超出了 $2 的大小限制',
            extError: '$1 类型不被支持',
            someErrorsOccurred: '发生了一些错误!',
            wentWrong: '出问题了哦!',
            pending: '等待上传',
            completed: '完成',
            inProgress: '正在上传'
        }
    };

}));